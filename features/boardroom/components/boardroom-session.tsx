"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { MeetingControls } from "@/features/boardroom/components/meeting-controls";
import { SeatingGrid } from "@/features/boardroom/components/seating-grid";
import { TranscriptFeed } from "@/features/boardroom/components/transcript-feed";
import { ConsensusPanel } from "@/features/boardroom/components/consensus-panel";
import { PitchHistory } from "@/features/boardroom/components/pitch-history";
import { SelectionExplainer } from "@/features/boardroom/components/selection-explainer";
import { boardErrorCopy } from "@/features/boardroom/error-copy";
import {
  advanceDebate,
  fetchLatestMeeting,
  fetchMeeting,
  fetchPastSessions,
  finalizeMeeting,
} from "@/features/boardroom/service";
import type { PastSession, SeatedExecutive, SessionPhase, TranscriptMessage } from "@/features/boardroom/types";
import { debateProgress, pickNextSpeaker } from "@/lib/ai/debate-policy";
import { TOPIC_LABEL } from "@/lib/ai/topics";
import { useBoardSpeech } from "@/hooks/use-board-speech";
// The roster is product configuration, not user data — the same array
// `/api/executives` serves. Importing it avoids a round-trip the seating
// grid would otherwise have to wait on before it could render.
import { executiveRoster } from "@/features/executives/roster";
import type {
  BoardVote,
  MeetingResponse,
  MeetingTranscriptMessage,
  SpeakerSelectionInfo,
} from "@/types/api";

type LoadState = "loading" | "ready" | "empty" | "error";

/**
 * Minimum pause between debate turns.
 *
 * Turns are issued back-to-back, so a session's whole token budget lands
 * inside a few seconds — far above a per-minute ceiling, which is what
 * produced 429s partway through a debate.
 *
 * The default is sized for Groq's free tier: 6,000 tokens per minute
 * against roughly 1,500 per turn is four turns a minute, so ~15s apart.
 * Pacing does not make a session finish sooner than the budget allows —
 * the provider enforces that either way — it decides whether the wait is
 * spent evenly between turns or in retry loops after each rejection.
 *
 * Reading the turn aloud now happens *inside* this wait rather than after
 * it, so the pacing the rate limit already forced on us is spent on speech
 * instead of an empty screen. A turn takes the longer of the two.
 *
 * Paid tiers have far more headroom: set `NEXT_PUBLIC_TURN_INTERVAL_MS` to
 * a smaller value, or `0` to disable the wait entirely.
 */
const TURN_INTERVAL_MS = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_TURN_INTERVAL_MS);
  return Number.isFinite(raw) && raw >= 0 && process.env.NEXT_PUBLIC_TURN_INTERVAL_MS
    ? raw
    : 15_000;
})();

function timeLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function toView(message: MeetingTranscriptMessage): TranscriptMessage {
  return {
    id: message.id,
    speaker: message.speakerName,
    role: message.role,
    message: message.message,
    timestamp: timeLabel(message.createdAt),
    isFounder: message.speakerId === "founder",
    ...(message.verification ? { verification: message.verification } : {}),
  };
}

export function BoardroomSession() {
  const searchParams = useSearchParams();
  const meetingParam = searchParams.get("meeting");

  const [meeting, setMeeting] = useState<MeetingResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<MeetingTranscriptMessage[]>([]);
  const [votes, setVotes] = useState<Record<string, BoardVote>>({});
  const [reportId, setReportId] = useState<string | undefined>(undefined);
  const [investmentScore, setInvestmentScore] = useState<number | undefined>(undefined);
  const [phase, setPhase] = useState<SessionPhase>("idle");
  /** Whose turn is being generated — distinct from who is audibly talking. */
  const [thinkingId, setThinkingId] = useState<string | null>(null);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [replyPending, setReplyPending] = useState(false);
  /** Why the board handed the floor to the last speaker — shown in the header. */
  const [selection, setSelection] = useState<SpeakerSelectionInfo | null>(null);
  /**
   * A question the board is waiting on the founder to answer. While this is
   * set the turn loop holds, which is what makes the meeting feel like a
   * conversation rather than a broadcast.
   */
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const { supported: speechSupported, muted, toggleMuted, voicingId, speakMessage, stop: stopSpeech } =
    useBoardSpeech();

  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  /** Bumped after each turn to wake the loop for the next one. */
  const [tick, setTick] = useState(0);
  const inFlight = useRef(false);
  /** A founder reply waiting to ride along with the next executive turn. */
  const queuedReply = useRef<{ text: string; tempId: string } | null>(null);
  /** Pending inter-turn wait, cleared when the founder cuts in or the view unmounts. */
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Resolver for the in-flight pacing wait, so clearing it doesn't hang the turn. */
  const pendingWait = useRef<(() => void) | null>(null);

  const clearTurnTimer = useCallback(() => {
    if (turnTimer.current !== null) {
      clearTimeout(turnTimer.current);
      turnTimer.current = null;
    }
    // The wait is awaited, not just scheduled — cancelling the timeout without
    // settling its promise would leave the turn parked forever.
    if (pendingWait.current !== null) {
      const resolve = pendingWait.current;
      pendingWait.current = null;
      resolve();
    }
  }, []);

  /** Resolves after the rate-limit interval, or early if the founder cuts in. */
  const waitBetweenTurns = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (TURN_INTERVAL_MS === 0) {
          resolve();
          return;
        }
        pendingWait.current = resolve;
        turnTimer.current = setTimeout(() => {
          turnTimer.current = null;
          pendingWait.current = null;
          resolve();
        }, TURN_INTERVAL_MS);
      }),
    [],
  );

  useEffect(() => clearTurnTimer, [clearTurnTimer]);

  // ---- Load the session ------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setLoadError(null);

    (meetingParam ? fetchMeeting(meetingParam) : fetchLatestMeeting())
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) {
          setLoadState("empty");
          return;
        }
        setMeeting(loaded);
        setTranscript(loaded.transcript);
        setVotes(loaded.votes ?? {});
        setReportId(loaded.reportId);
        // A session that already has a report is history, not a live debate.
        setPhase(loaded.status === "completed" || loaded.reportId ? "complete" : "debating");
        setLoadState("ready");
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setLoadError(error.message);
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [meetingParam]);

  // ---- Pitch history ---------------------------------------------------

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    fetchPastSessions()
      .then(setPastSessions)
      .catch(() => setPastSessions([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const seatedIds = useMemo(
    () => (meeting?.executiveIds?.length ? meeting.executiveIds : executiveRoster.map((exec) => exec.id)),
    [meeting],
  );

  /** Names and roles the speaker policy needs to match founder mentions. */
  const identities = useMemo(
    () =>
      Object.fromEntries(
        seatedIds.map((id) => {
          const persona = executiveRoster.find((exec) => exec.id === id);
          return [id, { name: persona?.name ?? id, role: persona?.role ?? "Executive" }];
        }),
      ),
    [seatedIds],
  );

  // ---- Drive the debate, one turn at a time ----------------------------

  useEffect(() => {
    if (loadState !== "ready" || !meeting || phase !== "debating" || inFlight.current) return;
    // The board asked the founder something and is waiting. Answering clears
    // this; so does "let the board continue".
    if (pendingQuestion) return;

    // Runs the identical scoring the route handler will run, so the thinking
    // indicator names the right executive before the response lands. This is
    // only sound because `debate-policy.ts` has no server-only imports — the
    // policy is genuinely shared, not reimplemented.
    const nextSpeakerId = pickNextSpeaker({
      seatedExecutiveIds: seatedIds,
      transcript,
      identities,
      pendingFounderMessage: queuedReply.current?.text,
    });
    if (!nextSpeakerId) {
      setPhase("finalizing");
      return;
    }

    let cancelled = false;
    const reply = queuedReply.current;
    queuedReply.current = null;

    inFlight.current = true;
    setThinkingId(nextSpeakerId);
    setTurnError(null);

    void (async () => {
      try {
        const result = await advanceDebate(meeting.id, reply?.text);
        if (cancelled) return;

        setTranscript((previous) => {
          // Swap the optimistic founder entry for the persisted one so ids
          // match the server after a reload.
          const reconciled =
            reply && result.founderMessage
              ? previous.map((message) => (message.id === reply.tempId ? result.founderMessage! : message))
              : previous;
          return result.message ? [...reconciled, result.message] : reconciled;
        });
        setReplyPending(false);
        if (result.selection) setSelection(result.selection);
        if (result.founderQuestion) setPendingQuestion(result.founderQuestion);
        // The turn has arrived, so the thinking indicator should go now
        // rather than after the speech — otherwise an executive appears to
        // still be composing a message that is already on screen.
        setThinkingId(null);

        // Started before the `isComplete` branch on purpose: the closing turn
        // deserves to be heard too, and returning early used to swallow it.
        const speaking = result.message
          ? speakMessage(result.message.message, result.message.speakerId)
          : Promise.resolve();

        if (result.isComplete) {
          // No pacing wait here — there is no next turn to space out, only
          // the last executive finishing their sentence before the vote.
          await speaking;
          if (cancelled) return;
          setPhase("finalizing");
          return;
        }

        // Read the turn aloud and serve the rate limit at the same time. The
        // two run concurrently and the turn takes whichever is longer, so
        // speech costs nothing when the interval already exceeds it.
        clearTurnTimer();
        await Promise.all([speaking, waitBetweenTurns()]);
        if (cancelled) return;

        setTick((value) => value + 1);
      } catch (error) {
        if (cancelled) return;
        // Put the reply back so resuming does not lose what the founder said.
        if (reply) queuedReply.current = reply;
        setTurnError((error as Error).message);
        setPhase("paused");
      } finally {
        if (!cancelled) {
          inFlight.current = false;
          setThinkingId(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      inFlight.current = false;
      // A pause or an unmount should stop the clock and the audio too, not
      // just the request in flight — otherwise a queued turn fires, or an
      // executive keeps talking, after the founder has stepped away.
      clearTurnTimer();
      stopSpeech();
    };
    // `transcript` is read but intentionally not a dependency: every turn
    // appends to it, which would re-enter this effect mid-flight. `tick` is
    // the explicit signal that the next turn may start.
    //
    // `pendingQuestion` is excluded for a sharper reason: it is *set* by the
    // turn currently running, so listing it would tear down that turn's own
    // effect mid-flight and cut the executive off mid-sentence as they asked
    // the question. The guard reads it correctly anyway, because React
    // rebuilds this callback every render — deps control re-runs, not
    // freshness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadState,
    meeting,
    phase,
    tick,
    seatedIds,
    identities,
    clearTurnTimer,
    waitBetweenTurns,
    speakMessage,
    stopSpeech,
  ]);

  // ---- Close out the session -------------------------------------------

  useEffect(() => {
    if (phase !== "finalizing" || !meeting || inFlight.current) return;

    let cancelled = false;
    inFlight.current = true;

    finalizeMeeting(meeting.id)
      .then((result) => {
        if (cancelled) return;
        setVotes(result.votes);
        setReportId(result.reportId);
        setInvestmentScore(result.investmentScore);
        setPhase("complete");
        // Deliverables and scores changed — refresh the sidebar list.
        loadHistory();
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setTurnError(error.message);
        setPhase("paused");
      })
      .finally(() => {
        if (!cancelled) inFlight.current = false;
      });

    return () => {
      cancelled = true;
      inFlight.current = false;
    };
  }, [phase, meeting, loadHistory]);

  // ---- Handlers --------------------------------------------------------

  const handleSend = useCallback(
    (text: string) => {
      const tempId = `local_${crypto.randomUUID()}`;
      queuedReply.current = { text, tempId };
      setReplyPending(true);
      setTranscript((previous) => [
        ...previous,
        {
          id: tempId,
          speakerId: "founder",
          speakerName: "You",
          role: "Founder",
          message: text,
          createdAt: new Date().toISOString(),
        },
      ]);
      // The founder speaking is worth cutting the pacing wait short — they
      // are waiting on a reply, and their turn adds no model call of its own.
      // Cutting the audio off mid-sentence is the point: interrupting the
      // board is exactly what the reply box is for.
      clearTurnTimer();
      stopSpeech();
      // Answering releases the hold — this is the reply the board waited for.
      setPendingQuestion(null);
      // Resume if the founder is answering after a pause or a failed turn.
      setPhase((current) => (current === "paused" || current === "idle" ? "debating" : current));
      setTick((value) => value + 1);
    },
    [clearTurnTimer, stopSpeech],
  );

  /** Declines the question and lets the board carry on without an answer. */
  const handleSkipQuestion = useCallback(() => {
    setPendingQuestion(null);
    setTick((value) => value + 1);
  }, []);

  const handleTogglePause = useCallback(() => {
    setPhase((current) => {
      if (current === "debating") {
        // Pausing has to silence the room as well as the request loop, or the
        // executive mid-sentence carries on over a paused session.
        stopSpeech();
        return "paused";
      }
      if (current === "paused" || current === "idle") return "debating";
      return current;
    });
    setTick((value) => value + 1);
  }, [stopSpeech]);

  /** Skips the board's remaining turns and goes straight to the vote. */
  const handleEndSession = useCallback(() => {
    setTurnError(null);
    stopSpeech();
    setPhase("finalizing");
  }, [stopSpeech]);

  // ---- Derived view model ----------------------------------------------

  const executives: SeatedExecutive[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const message of transcript) {
      if (message.speakerId === "founder" || message.speakerId === "system") continue;
      counts.set(message.speakerId, (counts.get(message.speakerId) ?? 0) + 1);
    }

    return seatedIds.map((id) => {
      const persona = executiveRoster.find((exec) => exec.id === id);
      const spoken = counts.get(id) ?? 0;
      // Holding the floor out loud outranks generating a turn, which outranks
      // simply having spoken earlier.
      const presence =
        voicingId === id ? "speaking" : thinkingId === id || spoken > 0 ? "active" : "idle";
      return {
        id,
        name: persona?.name ?? id,
        role: persona?.role ?? "Executive",
        presence,
        vote: votes[id],
      };
    });
  }, [seatedIds, transcript, thinkingId, voicingId, votes]);

  const messages = useMemo(() => transcript.map(toView), [transcript]);
  const progress = useMemo(
    () => debateProgress({ seatedExecutiveIds: seatedIds, transcript }),
    [seatedIds, transcript],
  );
  const nameFor = (id: string | null) =>
    id ? (executiveRoster.find((exec) => exec.id === id)?.name ?? null) : null;
  const typingAs = nameFor(thinkingId);
  const speakingAs = nameFor(voicingId);

  // A weak topic read means fairness, not relevance, decided the turn —
  // labelling it "market size" then would misrepresent why this person is
  // speaking, so it is only shown once the detector is reasonably sure.
  const topicLabel =
    selection && selection.topic !== "general" && selection.topicConfidence >= 0.25
      ? (TOPIC_LABEL[selection.topic as keyof typeof TOPIC_LABEL] ?? null)
      : null;

  // ---- Render ----------------------------------------------------------

  if (loadState === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (loadState === "error") {
    return <ErrorState description={loadError ?? "Could not load this session."} onRetry={() => window.location.reload()} />;
  }

  if (loadState === "empty" || !meeting) {
    return (
      <EmptyState
        icon={Gavel}
        title="No board session yet"
        description="Submit a pitch and eight AI executives will debate it live, then vote and write up a full report."
        action={
          <Button asChild>
            <Link href="/meeting/new">Convene the board</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* The header and the seats are one pinned stage: who is in the room
          stays visible for the whole session, the way the participant strip
          does on a call. */}
      <MeetingControls
        startupName={meeting.startupName}
        oneLiner={meeting.oneLiner}
        stage={meeting.stage}
        industry={meeting.industry}
        phase={phase}
        progress={progress}
        onTogglePause={handleTogglePause}
        onEndSession={handleEndSession}
        speechSupported={speechSupported}
        muted={muted}
        onToggleMuted={toggleMuted}
        nowSpeaking={speakingAs}
        debatePhase={progress.phase}
        topicLabel={topicLabel}
      >
        <SeatingGrid executives={executives} />
        {/* The scoring that chose this speaker, from the payload the turn
            already returned. Without it the orchestration is invisible and
            the board reads as a rota. */}
        <div className="mt-3">
          <SelectionExplainer selection={selection} identities={identities} />
        </div>
      </MeetingControls>

      {turnError && (
        <ErrorState
          {...boardErrorCopy(turnError)}
          retryLabel="Resume"
          onRetry={() => {
            setTurnError(null);
            setPhase("debating");
            setTick((value) => value + 1);
          }}
        />
      )}

      {/*
        `min-w-0` on both tracks is load-bearing. A grid item defaults to
        `min-width: auto`, so it refuses to shrink below its content's
        intrinsic width — one long unbroken string in the transcript (a URL,
        an org id) widens the 1.5fr track, pushes the grid past the viewport
        and gives the whole page a horizontal scrollbar.
      */}
      <div className="grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <TranscriptFeed
            messages={messages}
            typingAs={typingAs}
            speakingAs={speakingAs}
            isLive={phase === "debating" || phase === "finalizing"}
            canReply={phase !== "complete" && phase !== "finalizing" && !replyPending}
            onSend={handleSend}
            pendingQuestion={pendingQuestion}
            onSkipQuestion={handleSkipQuestion}
          />
        </div>
        {/* `items-start` on the grid plus this column's own scroll keeps the
            two tracks from stretching to a shared height and leaving the
            shorter one with a trailing gap. */}
        <div className="flex min-w-0 flex-col gap-4">
          <ConsensusPanel
            executives={executives}
            phase={phase}
            reportId={reportId}
            investmentScore={investmentScore}
          />
          <PitchHistory sessions={pastSessions} loading={historyLoading} currentMeetingId={meeting.id} />
        </div>
      </div>
    </div>
  );
}
