import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiTeacher } from "../../api/endpoints";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { Modal } from "../../components/ui/Modal";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { Users, TrendingUp, AlertTriangle, Plus, Search, Mail } from "lucide-react";

function num(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}
function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return String(s);
  }
}
function dayLabel(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="mt-1 text-3xl font-black text-gray-900">{value}</div>
          {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
        </div>
        <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

export function TeacherDashboard() {
  const qc = useQueryClient();


  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [weakLimit, setWeakLimit] = useState(5);
  const [riskThreshold, setRiskThreshold] = useState(50);

  const [memberSearch, setMemberSearch] = useState("");
  const [activeStudent, setActiveStudent] = useState(null); 


  const groupsQ = useQuery({
    queryKey: ["teacher", "groups"],
    queryFn: apiTeacher.listGroups,
  });
  const groups = groupsQ.data || [];

 
  useEffect(() => {
    if (!selectedGroupId && groups.length) setSelectedGroupId(groups[0].id);
  }, [groups, selectedGroupId]);


  const createGroupM = useMutation({
    mutationFn: apiTeacher.createGroup,
    onSuccess: () => {
      setNewGroupName("");
      qc.invalidateQueries({ queryKey: ["teacher", "groups"] });
    },
  });


  const membersQ = useQuery({
    queryKey: ["teacher", "members", selectedGroupId],
    queryFn: () => apiTeacher.listMembers(selectedGroupId),
    enabled: !!selectedGroupId,
  });

  const addMemberM = useMutation({
    mutationFn: ({ groupId, payload }) => apiTeacher.addMember(groupId, payload),
    onSuccess: () => {
      setStudentEmail("");
      qc.invalidateQueries({ queryKey: ["teacher", "members", selectedGroupId] });
      qc.invalidateQueries({ queryKey: ["teacher", "overview", selectedGroupId] });
      qc.invalidateQueries({ queryKey: ["teacher", "at-risk", selectedGroupId] });
    },
  });


  const overviewQ = useQuery({
    queryKey: ["teacher", "overview", selectedGroupId],
    queryFn: () => apiTeacher.overview(selectedGroupId),
    enabled: !!selectedGroupId,
  });

  const weakTopicsQ = useQuery({
    queryKey: ["teacher", "weak-topics", selectedGroupId, weakLimit],
    queryFn: () => apiTeacher.weakTopics(selectedGroupId, weakLimit),
    enabled: !!selectedGroupId,
  });

  const trendQ = useQuery({
    queryKey: ["teacher", "trend", selectedGroupId],
    queryFn: () => apiTeacher.trend(selectedGroupId),
    enabled: !!selectedGroupId,
  });

  const atRiskQ = useQuery({
    queryKey: ["teacher", "at-risk", selectedGroupId, riskThreshold],
    queryFn: () => apiTeacher.atRisk(selectedGroupId, riskThreshold),
    enabled: !!selectedGroupId,
  });

  const overview = overviewQ.data || {};
  const studentsCount = num(overview.students_count);
  const attemptsCount = num(overview.attempts_count);
  const avgPercent = num(overview.avg_percent);

  const trendData = (trendQ.data || []).map((x) => ({
    day: x.day,
    label: dayLabel(x.day),
    avg: num(x.avg_percent),
  }));

  const members = membersQ.data || [];

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = (m.full_name || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, memberSearch]);


  const riskMap = useMemo(() => {
    const map = new Map();
    for (const u of atRiskQ.data || []) {
      if (u.email) map.set(String(u.email).toLowerCase(), u);
      if (u.id) map.set(String(u.id), u);
    }
    return map;
  }, [atRiskQ.data]);

  const selectedGroup = groups.find((g) => String(g.id) === String(selectedGroupId));

  return (
    <div className="space-y-6">
   
      <Card className="p-6 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white border-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold opacity-90">Teacher Mode</div>
            <div className="mt-1 text-3xl font-black">
              {selectedGroup ? selectedGroup.name : "Teacher Dashboard"}
            </div>
            <div className="mt-1 text-sm opacity-90">
              Groups • Students • Analytics (live from backend)
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              onClick={() => qc.invalidateQueries({ queryKey: ["teacher"] })}
            >
              Refresh
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
    
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-black text-gray-900">Groups</div>
              {groupsQ.isLoading ? <span className="text-xs text-gray-500">Loading…</span> : null}
            </div>

            {groupsQ.isError ? (
              <div className="mt-2 text-sm text-red-600">
                Failed to load groups: {groupsQ.error?.message}
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {groupsQ.isLoading ? (
                <>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </>
              ) : (
                groups.map((g) => (
                  <button
                    key={g.id}
                    className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      String(selectedGroupId) === String(g.id)
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedGroupId(g.id)}
                  >
                    <div className="font-semibold text-gray-900">{g.name}</div>
                    <div className="text-xs text-gray-500">{fmtDate(g.created_at)}</div>
                  </button>
                ))
              )}

              {!groupsQ.isLoading && !groups.length ? (
                <div className="text-sm text-gray-500">No groups yet. Create your first group.</div>
              ) : null}
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="text-sm font-semibold text-gray-700">Create group</div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="e.g. Python 101"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <Button
                  disabled={!newGroupName.trim() || createGroupM.isPending}
                  onClick={() => createGroupM.mutate({ name: newGroupName.trim() })}
                >
                  <Plus size={16} className="mr-2" />
                  Create
                </Button>
              </div>

              {createGroupM.isError ? (
                <div className="mt-2 text-sm text-red-600">
                  {createGroupM.error?.response?.data?.error || createGroupM.error?.message}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="p-4">
            <div className="font-black text-gray-900">Add student</div>
            <div className="mt-1 text-sm text-gray-600">
              Add by email (must be student account).
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                placeholder="student@mail.com"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
              />
              <Button
                disabled={!selectedGroupId || !studentEmail.trim() || addMemberM.isPending}
                onClick={() =>
                  addMemberM.mutate({
                    groupId: selectedGroupId,
                    payload: { student_email: studentEmail.trim() },
                  })
                }
              >
                Add
              </Button>
            </div>

            {addMemberM.isError ? (
              <div className="mt-2 text-sm text-red-600">
                {addMemberM.error?.response?.data?.error || addMemberM.error?.message}
              </div>
            ) : null}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-black text-gray-900">Members</div>
              <span className="text-xs text-gray-500">{members.length}</span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                <Search size={18} className="text-gray-600" />
              </div>
              <Input
                placeholder="Search by name or email…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>

            <div className="mt-3 space-y-2 max-h-[360px] overflow-auto pr-1">
              {membersQ.isLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : membersQ.isError ? (
                <div className="text-sm text-red-600">Members error: {membersQ.error?.message}</div>
              ) : !filteredMembers.length ? (
                <div className="text-sm text-gray-500">No students found.</div>
              ) : (
                filteredMembers.map((m) => {
                  const risk = riskMap.get(String(m.email || "").toLowerCase()) || riskMap.get(String(m.id));
                  const percent = risk ? num(risk.percent, null) : null;

                  return (
                    <button
                      key={m.id}
                      onClick={() => setActiveStudent(m)}
                      className="w-full text-left rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 p-3 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-900">{m.full_name}</div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </div>
                        <div className="text-right">
                          {percent !== null ? (
                            <div className={`text-sm font-black ${percent < riskThreshold ? "text-red-600" : "text-emerald-600"}`}>
                              {percent}%
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">—</div>
                          )}
                          <div className="text-[11px] text-gray-400">click → details</div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        
        <div className="space-y-6">
          {!selectedGroupId ? (
            <Card className="p-6">
              <div className="text-gray-700">Select or create a group.</div>
            </Card>
          ) : (
            <>
       
              <div className="grid gap-4 md:grid-cols-3">
                {overviewQ.isLoading ? (
                  <>
                    <Skeleton className="h-[98px] w-full" />
                    <Skeleton className="h-[98px] w-full" />
                    <Skeleton className="h-[98px] w-full" />
                  </>
                ) : (
                  <>
                    <StatCard
                      icon={Users}
                      label="Students"
                      value={studentsCount}
                      sub="members in selected group"
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="Submitted attempts"
                      value={attemptsCount}
                      sub="all submitted attempts"
                    />
                    <StatCard
                      icon={AlertTriangle}
                      label="Average percent"
                      value={`${avgPercent}%`}
                      sub="group average score"
                    />
                  </>
                )}
              </div>

       
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black text-gray-900">Trend</div>
                      <div className="text-sm text-gray-500">Average score by day</div>
                    </div>
                    {trendQ.isLoading ? <span className="text-xs text-gray-500">Loading…</span> : null}
                  </div>

                  <div className="mt-4 h-56">
                    {trendQ.isLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : trendQ.isError ? (
                      <div className="text-sm text-red-600">Trend error: {trendQ.error?.message}</div>
                    ) : trendData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="avg" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                        No trend data yet. When students submit more attempts across days, the chart will fill up.
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black text-gray-900">Weak topics</div>
                      <div className="text-sm text-gray-500">Most frequent wrong answers</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Limit</span>
                      <select
                        className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-sm"
                        value={weakLimit}
                        onChange={(e) => setWeakLimit(Number(e.target.value))}
                      >
                        {[5, 10, 15, 20].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {weakTopicsQ.isLoading ? (
                      <>
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                      </>
                    ) : weakTopicsQ.isError ? (
                      <div className="text-sm text-red-600">Weak topics error: {weakTopicsQ.error?.message}</div>
                    ) : !(weakTopicsQ.data || []).length ? (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                        No weak topics yet. Once students make mistakes, this list will appear.
                      </div>
                    ) : (
                      (weakTopicsQ.data || []).map((x, i) => (
                        <div key={i} className="rounded-2xl border border-gray-100 p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-gray-900">{x.topic}</div>
                            <div className="text-sm font-black text-indigo-600">
                              {num(x.wrong_count)} wrong
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

      
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-black text-gray-900">At risk</div>
                    <div className="text-sm text-gray-500">Students below threshold (last score)</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Threshold</span>
                    <select
                      className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-sm"
                      value={riskThreshold}
                      onChange={(e) => setRiskThreshold(Number(e.target.value))}
                    >
                      {[30, 40, 50, 60, 70].map((n) => (
                        <option key={n} value={n}>
                          {n}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {atRiskQ.isLoading ? (
                    <>
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </>
                  ) : atRiskQ.isError ? (
                    <div className="text-sm text-red-600">At-risk error: {atRiskQ.error?.message}</div>
                  ) : !(atRiskQ.data || []).length ? (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                      No one is at risk 🎉
                    </div>
                  ) : (
                    (atRiskQ.data || []).map((u) => (
                      <div key={u.id} className="rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-gray-900">{u.full_name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-red-600">{num(u.percent)}%</div>
                            <div className="text-xs text-gray-500">{fmtDate(u.submitted_at)}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

 
      <StudentModal
        open={!!activeStudent}
        student={activeStudent}
        onClose={() => setActiveStudent(null)}
        risk={activeStudent ? (riskMap.get(String(activeStudent.email || "").toLowerCase()) || riskMap.get(String(activeStudent.id))) : null}
        riskThreshold={riskThreshold}
      />
    </div>
  );
}

function StudentModal({ open, student, onClose, risk, riskThreshold }) {
  if (!student) return null;

  const percent = risk ? num(risk.percent, null) : null;

  return (
    <Modal open={open} title="Student card" onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-gray-900">{student.full_name}</div>
          <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
            <Mail size={16} className="text-gray-500" />
            <span>{student.email}</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">Student ID: {student.id}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-right min-w-[160px]">
          <div className="text-xs text-gray-500">Last score</div>
          <div className={`text-3xl font-black ${percent !== null && percent < riskThreshold ? "text-red-600" : "text-indigo-600"}`}>
            {percent !== null ? `${percent}%` : "—"}
          </div>
          <div className="text-xs text-gray-500">
            {risk?.submitted_at ? fmtDate(risk.submitted_at) : "no submitted data"}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm font-black text-gray-900">What we can show now</div>
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <div>• Profile (name/email/id)</div>
            <div>• Last score if student is “at risk”</div>
            <div className="text-xs text-gray-400">
              For full history / per-student weak topics нужен teacher endpoint.
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-black text-gray-900">Next upgrade (needs backend)</div>
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <div>• Attempts history for this student</div>
            <div>• Weak topics for this student</div>
            <div>• Trend chart per student</div>
          </div>
        </Card>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            navigator.clipboard?.writeText(student.email || "");
          }}
        >
          Copy email
        </Button>
        <Button
          onClick={() => {
            window.location.href = `mailto:${student.email}`;
          }}
        >
          Email student
        </Button>
      </div>
    </Modal>
  );
}

