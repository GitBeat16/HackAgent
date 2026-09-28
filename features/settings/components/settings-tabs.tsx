"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/server/errors";
import { notificationOptions } from "../types";

export function SettingsTabs() {
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function togglePref(id: string, checked: boolean) {
    setPrefs((prev) => ({ ...prev, [id]: checked }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Manage your public persona.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Name</Label>
            <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Job Title</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Control what you get emailed about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationOptions.map(opt => (
            <div key={opt.id} className="flex items-start justify-between">
              <div>
                <Label>{opt.label}</Label>
                <p className="text-sm text-muted-foreground">{opt.description}</p>
              </div>
              <input type="checkbox" checked={!!prefs[opt.id]} onChange={e => togglePref(opt.id, e.target.checked)} />
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          {saveError && <p className="text-sm text-destructive ml-4">{saveError}</p>}
        </CardFooter>
      </Card>
    </div>
  );
}
