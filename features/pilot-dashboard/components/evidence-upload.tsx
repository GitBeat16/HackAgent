"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { uploadMilestoneEvidence } from "../service";

export function EvidenceUpload({ milestoneId, onUploaded }: { milestoneId: string; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      await uploadMilestoneEvidence(milestoneId, file);
      alert("Evidence uploaded successfully!");
      onUploaded();
    } catch (error) {
      console.error(error);
      alert("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/png, image/jpeg, application/pdf"
      />
      <Button 
        size="sm" 
        variant="outline" 
        disabled={uploading} 
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? "Uploading..." : "Upload Evidence"}
      </Button>
    </div>
  );
}
