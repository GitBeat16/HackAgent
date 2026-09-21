export async function uploadMilestoneEvidence(milestoneId: string, file: File) {
  const formData = new FormData();
  formData.append("evidence", file);

  const res = await fetch(`/api/milestones/${milestoneId}/evidence`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to upload evidence");
  return res.json();
}
