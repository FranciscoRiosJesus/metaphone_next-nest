"use client";

import { checkDuplicate, createAthlete, fetchAthletes } from "@/lib/api";
import type {
  AlertMessage,
  Athlete,
  CreateAthleteInput,
  DuplicateCheckResponse,
} from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [dupWarning, setDupWarning] = useState<DuplicateCheckResponse | null>(
    null,
  );
  const [form, setForm] = useState<CreateAthleteInput>({
    firstName: "",
    lastName: "",
    position: "",
    parentEmail: "",
  });

  const loadAthletes = useCallback(async () => {
    try {
      const data = await fetchAthletes();
      setAthletes(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("loadAthletes failed:", msg);
      setAlert({
        type: "error",
        title: "Error",
        message: `Failed to load athletes: ${msg}`,
      });
    }
  }, []);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  // Live duplicate check on blur
  const handleBlurCheck = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setDupWarning(null);
      return;
    }
    try {
      const result = await checkDuplicate({
        firstName: form.firstName,
        lastName: form.lastName,
        parentEmail: form.parentEmail || undefined,
      });
      setDupWarning(result.isDuplicate ? result : null);
    } catch {
      // Silently fail on pre-check
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert(null);

    try {
      const result = await createAthlete(form);

      if (result.error) {
        const dupCheck = result.duplicateCheck;
        if (dupCheck) {
          const levelLabel =
            dupCheck.level === "exact"
              ? "Exact Duplicate"
              : dupCheck.level === "phonetic"
                ? "Phonetic Duplicate"
                : "Possible Duplicate";
          setAlert({
            type: dupCheck.level === "similar" ? "warning" : "error",
            title: levelLabel,
            message: `${dupCheck.details}${
              dupCheck.matchedAthlete
                ? ` — matches "${dupCheck.matchedAthlete.firstName} ${dupCheck.matchedAthlete.lastName}" (${dupCheck.matchedAthlete.parentEmail})`
                : ""
            }`,
          });
        } else {
          setAlert({ type: "error", title: "Error", message: result.error });
        }
      } else {
        setAlert({
          type: "success",
          title: "Added!",
          message: `${form.firstName} ${form.lastName} added successfully.`,
        });
        setForm({ firstName: "", lastName: "", position: "", parentEmail: "" });
        setDupWarning(null);
        await loadAthletes();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("handleSubmit failed:", msg);
      setAlert({ type: "error", title: "Error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof CreateAthleteInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">Athlete Manager</h1>
          <p className="text-slate-500 mt-1">
            Add candidates with robust deduplication
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <div
            role="alert"
            className={`rounded-lg border p-4 flex items-start gap-3 ${
              alert.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : alert.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : alert.type === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            {alert.type === "success" && (
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            {alert.type === "error" && (
              <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            {alert.type === "warning" && (
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            {alert.type === "info" && (
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold">{alert.title}</p>
              <p className="text-sm mt-0.5">{alert.message}</p>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="ml-auto text-current opacity-50 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Quick Manual Add Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-700">
              Quick Manual Add
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  onBlur={handleBlurCheck}
                  placeholder="e.g. John"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  onBlur={handleBlurCheck}
                  placeholder="e.g. Smith"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Position
                </label>
                <input
                  type="text"
                  required
                  value={form.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                  placeholder="e.g. Forward"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Parent/Household Email
                </label>
                <input
                  type="email"
                  required
                  value={form.parentEmail}
                  onChange={(e) => handleChange("parentEmail", e.target.value)}
                  onBlur={handleBlurCheck}
                  placeholder="parent@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Live duplicate warning */}
            {dupWarning && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-amber-800 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    {dupWarning.level === "exact"
                      ? "Exact duplicate detected"
                      : dupWarning.level === "phonetic"
                        ? "Phonetic duplicate detected"
                        : "Possible duplicate detected"}{" "}
                    ({(dupWarning.confidence * 100).toFixed(0)}% confidence)
                  </p>
                  <p className="text-xs mt-0.5">{dupWarning.details}</p>
                  {dupWarning.matchedAthlete && (
                    <p className="text-xs mt-0.5">
                      Matches: {dupWarning.matchedAthlete.firstName}{" "}
                      {dupWarning.matchedAthlete.lastName} (
                      {dupWarning.matchedAthlete.parentEmail})
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors uppercase tracking-wider text-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Add to Candidates"
              )}
            </button>
          </form>
        </div>

        {/* Athletes Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-700">
              Candidates ({athletes.length})
            </h2>
            <button
              onClick={loadAthletes}
              disabled={loading}
              className="ml-auto text-xs text-slate-500 hover:text-slate-700 border border-slate-300 px-3 py-1 rounded-md transition"
            >
              Refresh
            </button>
          </div>

          {athletes.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No candidates yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Parent Email
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Phonetic Keys
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {a.firstName} {a.lastName}
                        <span className="block text-xs text-slate-400">
                          norm: {a.normalizedFirstName} {a.normalizedLastName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {a.position}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {a.parentEmail}
                      </td>
                      <td className="py-2.5 px-3">
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {a.metaphoneFirstName} / {a.metaphoneLastName}
                        </code>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
