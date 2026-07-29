/**
 * Graded pitches for evaluating the board.
 *
 * ## What this is and is not
 *
 * This is a *discrimination* set, not ground truth. Each pitch carries a tier
 * assigned by hand on criteria a real investor would apply — is there a
 * specific customer, a real metric, a defensible wedge, an honest risk — not
 * on any observed outcome. So the eval can answer "does the board's score
 * track investability as a human would judge it, consistently?" and cannot
 * answer "does the board predict which startups succeed?".
 *
 * That distinction matters and should be stated whenever the numbers are
 * shown. Claiming predictive validity from six hand-written pitches would be
 * exactly the kind of unearned confidence this project criticises in its own
 * Research agent.
 *
 * Pitches are written to be realistic in *form* — the weak ones are not
 * strawmen, they are the kind of pitch that genuinely gets sent to investors.
 */

export type PitchTier = "strong" | "mediocre" | "weak";

export interface EvalPitch {
  id: string;
  tier: PitchTier;
  startupName: string;
  oneLiner: string;
  industry: string;
  stage: string;
  pitch: string;
  /** Why this tier — the rubric, so a reader can disagree with the label. */
  rationale: string;
}

export const evalPitches: EvalPitch[] = [
  {
    id: "strong-1",
    tier: "strong",
    startupName: "Loadbear",
    oneLiner: "Structural inspection reports for bridge engineers, generated from drone footage.",
    industry: "infrastructure",
    stage: "seed",
    pitch:
      "State DOTs must inspect 617,000 US bridges every two years. Today a two-person crew spends " +
      "six hours per bridge and writes the report by hand; we fly the same bridge in 40 minutes and " +
      "produce the FHWA-format report automatically. We have 11 paying customers across 4 states, " +
      "$340K ARR growing 22% month over month, and 94% gross margin. Our two founders spent nine " +
      "years at a bridge inspection firm and wrote the FHWA rating software the incumbents license. " +
      "Net revenue retention is 140% because departments expand from pilot districts to whole states. " +
      "The risk is procurement cycle length — our median sales cycle is 7 months and we have not yet " +
      "closed a state-wide contract, which is what the raise is for.",
    rationale:
      "Specific customer, verifiable market size, real revenue with a growth rate, founder-market fit, " +
      "honest and named risk. This is what a fundable seed pitch looks like.",
  },
  {
    id: "strong-2",
    tier: "strong",
    startupName: "Cadence Labs",
    oneLiner: "Automated reconciliation for pharmacy benefit managers.",
    industry: "fintech",
    stage: "seed",
    pitch:
      "PBMs reconcile claims against manufacturer rebates manually — a mid-sized PBM runs a 14-person " +
      "team doing this in Excel and still writes off 2-3% of rebate revenue as unrecoverable. We " +
      "automate the match and recover the write-off. Two customers in production, $180K ARR, and we " +
      "recovered $2.1M for our first customer in eight months, which is why they renewed at 3x. " +
      "Our CTO built claims infrastructure at a top-five PBM for six years. We are concentrated — two " +
      "customers is two customers — and the sales cycle into regulated pharma is long. We need a " +
      "third and fourth logo before a Series A conversation is credible.",
    rationale:
      "Quantified pain, provable ROI, domain-expert founder, and the concentration risk is stated rather " +
      "than hidden. Slightly earlier than strong-1 but the same quality of thinking.",
  },
  {
    id: "mediocre-1",
    tier: "mediocre",
    startupName: "Trailhead",
    oneLiner: "An AI assistant that helps small businesses manage their social media.",
    industry: "marketing",
    stage: "pre-seed",
    pitch:
      "Small businesses know they should post consistently but do not have time. Trailhead generates " +
      "a month of posts from a short brand questionnaire and schedules them. We launched four months " +
      "ago and have 380 free users and 22 paying at $29/month. Retention after 90 days is about 45%. " +
      "The market is large — there are 33 million small businesses in the US. We are competing with " +
      "Buffer and Hootsuite, but they are scheduling tools and we generate the content. Our plan is " +
      "to grow through content marketing and partnerships with web design agencies.",
    rationale:
      "Real product, real users, real revenue — but tiny, weak retention, a crowded category, and a " +
      "differentiation claim (generation vs scheduling) that incumbents can copy in a quarter.",
  },
  {
    id: "mediocre-2",
    tier: "mediocre",
    startupName: "Kelp",
    oneLiner: "A marketplace connecting restaurants with surplus produce from local farms.",
    industry: "food",
    stage: "seed",
    pitch:
      "40% of produce is wasted between farm and table. Kelp lets farms list surplus at a discount and " +
      "restaurants buy it same-day. We operate in two cities with 60 restaurants and 24 farms, doing " +
      "$95K GMV a month at a 12% take rate. Logistics is our hardest problem — we currently use " +
      "third-party couriers and our delivery margin is negative in one of the two cities. Restaurants " +
      "love the pricing but order irregularly because surplus is unpredictable, so we cannot promise " +
      "supply. We think density solves both problems.",
    rationale:
      "Genuine traction and unusually honest about unit economics, but a marketplace with unreliable " +
      "supply and negative delivery margin is a hard business, and 'density solves it' is a hope.",
  },
  {
    id: "weak-1",
    tier: "weak",
    startupName: "Nexara",
    oneLiner: "A revolutionary AI-powered platform transforming the future of work.",
    industry: "saas",
    stage: "pre-seed",
    pitch:
      "The future of work is changing and companies need to adapt. Nexara is an AI-powered platform " +
      "that leverages cutting-edge machine learning to optimise workplace productivity and unlock " +
      "human potential. Our proprietary algorithms deliver actionable insights that drive measurable " +
      "outcomes. The global future-of-work market is projected to reach $1.2 trillion by 2030 and we " +
      "are positioned to capture a meaningful share. Our team is passionate about building the future. " +
      "We are raising to accelerate growth and expand our go-to-market.",
    rationale:
      "No customer, no product description, no metric, no named competitor, and a top-down market " +
      "figure doing all the work. The archetypal unfundable pitch.",
  },
  {
    id: "weak-2",
    tier: "weak",
    startupName: "Ollie",
    oneLiner: "An app that reminds you to drink water, with a social feed.",
    industry: "consumer",
    stage: "pre-seed",
    pitch:
      "Most people are dehydrated and do not realise it. Ollie sends smart reminders based on your " +
      "activity and lets you share hydration streaks with friends. We have 4,000 downloads since " +
      "launch and about 200 weekly active users. We plan to monetise later through premium features " +
      "and brand partnerships with beverage companies. Everyone drinks water, so the market is " +
      "everyone. We are looking for $500K to hire two engineers and grow the user base.",
    rationale:
      "5% weekly retention on a free utility with no monetisation and 'the market is everyone'. " +
      "Real product, no business.",
  },
];

export const TIER_ORDER: PitchTier[] = ["weak", "mediocre", "strong"];
