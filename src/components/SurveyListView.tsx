"use client";

/**
 * Phase 11.6 — Survey List View (Client Component)
 *
 * Displays a list of surveys with create capability.
 */

import { useState } from "react";
import {
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  Archive,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { createSurvey, type Survey } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SurveyListViewProps {
  initialSurveys: Survey[];
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  draft: { icon: FileText, color: "text-rosely-mist", label: "Draft" },
  active: { icon: Clock, color: "text-rosely-teal", label: "Active" },
  closed: { icon: Archive, color: "text-rosely-dusk", label: "Closed" },
};

export function SurveyListView({ initialSurveys }: SurveyListViewProps) {
  const [surveys, setSurveys] = useState<Survey[]>(initialSurveys);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<{ text: string; type: string }[]>([
    { text: "", type: "text" },
  ]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const validQuestions = questions.filter((q) => q.text.trim());
      const res = await createSurvey({
        title: title.trim(),
        description: description.trim() || undefined,
        questions: validQuestions,
      });
      setSurveys((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setQuestions([{ text: "", type: "text" }]);
    } catch {
      setError("Failed to create survey");
    } finally {
      setCreating(false);
    }
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { text: "", type: "text" }]);
  }

  function updateQuestion(index: number, field: "text" | "type", value: string) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  const activeSurveys = surveys.filter((s) => s.status === "active");
  const draftSurveys = surveys.filter((s) => s.status === "draft");
  const closedSurveys = surveys.filter((s) => s.status === "closed");

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-rosely-blush p-4">
          <p className="text-xs text-rosely-mist uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-rosely-teal mt-1">{activeSurveys.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-rosely-blush p-4">
          <p className="text-xs text-rosely-mist uppercase tracking-wider">Draft</p>
          <p className="text-2xl font-bold text-rosely-mist mt-1">{draftSurveys.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-rosely-blush p-4">
          <p className="text-xs text-rosely-mist uppercase tracking-wider">Closed</p>
          <p className="text-2xl font-bold text-rosely-dusk mt-1">{closedSurveys.length}</p>
        </div>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white hover:bg-rosely-mauve transition-colors"
        >
          <Plus className="size-4" />
          Create Survey
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-card rounded-xl border border-rosely-blush p-5">
          <h2 className="text-base font-semibold text-rosely-night mb-4">New Survey</h2>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label htmlFor="survey-title" className="block text-sm font-medium text-rosely-night">
                Title
              </label>
              <input
                id="survey-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-rosely-blush px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
                placeholder="e.g., Application Data Quality Review"
              />
            </div>
            <div>
              <label htmlFor="survey-desc" className="block text-sm font-medium text-rosely-night">
                Description
              </label>
              <textarea
                id="survey-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-rosely-blush px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
                placeholder="Brief description of the survey purpose"
              />
            </div>

            {/* Questions */}
            <div>
              <label className="block text-sm font-medium text-rosely-night mb-2">Questions</label>
              <div className="flex flex-col gap-2">
                {questions.map((q, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => updateQuestion(i, "text", e.target.value)}
                      placeholder={`Question ${i + 1}`}
                      className="flex-1 rounded-lg border border-rosely-blush px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
                    />
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(i, "type", e.target.value)}
                      aria-label={`Question ${i + 1} type`}
                      className="rounded-lg border border-rosely-blush px-2 py-2 text-sm text-rosely-night"
                    >
                      <option value="text">Text</option>
                      <option value="select">Select</option>
                      <option value="rating">Rating</option>
                      <option value="boolean">Yes/No</option>
                    </select>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(i)}
                        className="text-rosely-mist hover:text-rosely-rose text-sm px-2 py-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="mt-2 text-sm text-rosely-plum hover:text-rosely-mauve"
              >
                + Add Question
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white hover:bg-rosely-mauve disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating…" : "Create Survey"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-rosely-blush px-4 py-2 text-sm font-medium text-rosely-dusk hover:text-rosely-night transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Survey List */}
      {surveys.length === 0 ? (
        <div className="bg-card rounded-xl border border-rosely-blush p-8 text-center">
          <ClipboardList className="size-12 text-rosely-mist mx-auto mb-3" />
          <p className="text-sm font-medium text-rosely-night">No surveys yet</p>
          <p className="text-xs text-rosely-mist mt-1">
            Create a survey to start collecting data quality feedback.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-rosely-blush divide-y divide-rosely-petal">
          {surveys.map((survey) => {
            const statusConf = STATUS_CONFIG[survey.status] ?? STATUS_CONFIG.draft;
            const StatusIcon = statusConf.icon;
            return (
              <div key={survey.id} className="p-4 hover:bg-rosely-cream/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-rosely-night">{survey.title}</h3>
                    {survey.description && (
                      <p className="text-xs text-rosely-dusk mt-0.5">{survey.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${statusConf.color}`}
                      >
                        <StatusIcon className="size-3" />
                        {statusConf.label}
                      </span>
                      <span className="text-xs text-rosely-mist">
                        {survey.questions?.length ?? 0} questions
                      </span>
                      {survey.responseCount !== undefined && (
                        <span className="text-xs text-rosely-mist">
                          <CheckCircle2 className="size-3 inline mr-0.5" />
                          {survey.responseCount} responses
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-rosely-mist shrink-0">
                    {new Date(survey.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
