'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ADMIN_EMAILS } from '@/lib/feature-flags';
import { challengeKeysToLabels } from '@/lib/founding-challenge-pills';

interface Application {
  id: string;
  first_name: string;
  email: string;
  journey_stage: string;
  biggest_challenge: string[] | string | null;
  biggest_challenge_other: string | null;
  what_tried_before: string | null;
  tech_comfort: number | null;
  working_with_attorney: string | null;
  can_commit: string;
  additional_notes: string | null;
  status: string;
  admin_notes: string | null;
  ref_token: string | null;
  referrer_application_id: string | null;
  referrals_sent: number;
  access_expires_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  onboarded_at: string | null;
  day_30_call_at: string | null;
  day_60_call_at: string | null;
  day_90_testimonial_status: string | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  deferred: number;
  declined: number;
  spots_full: number;
  onboarded: number;
  active: number;
  completed: number;
  withdrew: number;
}

interface Checkin {
  id: string;
  application_id: string;
  week_number: number;
  opens_this_week: string | null;
  uses_this_week: string[] | null;
  most_helpful: string | null;
  broken_or_confusing: string | null;
  wishes_it_did: string | null;
  submitted_at: string;
  founding_member_applications: { first_name: string; email: string };
}

const STATUS_COLORS: Record<string, string> = {
  pending:    '#F4846B',
  approved:   '#2F9D94',
  deferred:   '#8C9E84',
  declined:   '#dc2626',
  spots_full: '#E57963',
  onboarded:  '#1A5F5A',
  active:     '#2F9D94',
  completed:  '#1A5F5A',
  withdrew:   '#9ca3af',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'pending',
  approved: 'approved',
  deferred: 'waitlist',
  declined: 'declined',
  spots_full: 'spots full',
  onboarded: 'onboarded',
  active: 'active',
  completed: 'completed',
  withdrew: 'withdrew',
};

const JOURNEY_LABELS: Record<string, string> = {
  pre_filing: 'Pre-filing',
  active_case: 'Active case',
  post_judgment_active: 'Post-judgment active',
  order_in_place: 'Order in place',
  high_conflict_no_court: 'High conflict, no court',
};

const ATTORNEY_LABELS: Record<string, string> = {
  yes_currently: 'Yes, currently',
  past_not_current: 'In past',
  no: 'No',
  prefer_not_to_say: 'Prefers not to share',
};

const COMMIT_LABELS: Record<string, string> = {
  yes: 'Yes',
  sometimes: 'Sometimes',
  not_sure: 'Not sure',
  no: 'No',         // legacy
  unsure: 'Unsure', // legacy
};

export default function AdminFoundingPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<'applications' | 'checkins'>('applications');

  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkinStats, setCheckinStats] = useState<{
    total: number;
    opens_distribution: Record<string, number>;
    uses_frequency: Array<[string, number]>;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const loadApplications = useCallback(async () => {
    const url = statusFilter
      ? `/api/founding/admin/applications?status=${statusFilter}`
      : '/api/founding/admin/applications';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setApplications(data.applications);
      setStats(data.stats);
    }
    setLoading(false);
  }, [statusFilter]);

  const loadCheckins = useCallback(async () => {
    const res = await fetch('/api/founding/admin/checkins');
    if (res.ok) {
      const data = await res.json();
      setCheckins(data.checkins);
      setCheckinStats(data.stats);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email || !(ADMIN_EMAILS as readonly string[]).includes(session.user.email.toLowerCase())) {
        router.push('/coach');
        return;
      }
      setAuthorized(true);
      await loadApplications();
      await loadCheckins();
    })();
  }, [router, loadApplications, loadCheckins]);

  useEffect(() => { if (authorized) loadApplications(); }, [statusFilter, authorized, loadApplications]);

  const decide = async (
    id: string,
    status: 'approved' | 'deferred' | 'declined' | 'spots_full',
    admin_notes?: string
  ) => {
    const verb =
      status === 'spots_full'
        ? 'Mark this applicant as Spots Full (waitlist email)?'
        : `Mark this application ${status}?`;
    if (!confirm(verb)) return;
    const res = await fetch(`/api/founding/admin/applications/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_notes }),
    });
    if (res.ok) {
      await loadApplications();
      setSelected(null);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Failed to update');
    }
  };

  const onboard = async (id: string) => {
    if (!confirm('Mark this Founding Member as onboarded? (do this AFTER you tag them in Skool)')) return;
    const res = await fetch(`/api/founding/admin/applications/${id}/onboard`, { method: 'POST' });
    if (res.ok) await loadApplications();
    else alert('Failed to mark onboarded');
  };

  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', padding: 24, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <button onClick={() => router.push('/coach')} style={{ background: 'none', border: 'none', color: '#2F9D94', cursor: 'pointer', marginBottom: 16, fontWeight: 600 }}>← Back to Coach</button>
        <h1 style={{ margin: 0, fontSize: 30, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, color: '#1F2937', letterSpacing: '-0.01em' }}>
          Founding Members
        </h1>
        <p style={{ margin: '6px 0 24px', color: '#1F2937', opacity: 0.7 }}>Applications, decisions, and weekly check-ins.</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #C7E4E0' }}>
          <button
            onClick={() => setTab('applications')}
            style={{
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'applications' ? '3px solid #2F9D94' : '3px solid transparent',
              color: tab === 'applications' ? '#1F2937' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Applications {stats ? `(${stats.total})` : ''}
          </button>
          <button
            onClick={() => setTab('checkins')}
            style={{
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'checkins' ? '3px solid #2F9D94' : '3px solid transparent',
              color: tab === 'checkins' ? '#1F2937' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Check-ins {checkinStats ? `(${checkinStats.total})` : ''}
          </button>
        </div>

        {tab === 'applications' && (
          <>
            {/* Stats */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                {(['total','pending','approved','onboarded','active'] as const).map(k => (
                  <div key={k} style={{ background: 'white', border: '1px solid #C7E4E0', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#1F2937', fontFamily: "'Fraunces', Georgia, serif" }}>{stats[k]}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Filter */}
            <div style={{ marginBottom: 12 }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #C7E4E0', background: 'white' }}>
                <option value="">All statuses</option>
                {['pending','approved','deferred','declined','spots_full','onboarded','active','completed','withdrew'].map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            {loading ? (
              <p style={{ color: '#6b7280' }}>Loading…</p>
            ) : applications.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No applications yet.</p>
            ) : (
              <div style={{ background: 'white', border: '1px solid #C7E4E0', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#EAF5F3', borderBottom: '1px solid #C7E4E0' }}>
                      <th style={th}>Name</th>
                      <th style={th}>Email</th>
                      <th style={th}>Journey</th>
                      <th style={th}>Attorney</th>
                      <th style={th}>Created</th>
                      <th style={th}>Status</th>
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => (
                      <tr key={app.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={td}><strong>{app.first_name}</strong>{app.referrer_application_id ? <span title="Referred" style={{ color: '#2F9D94', marginLeft: 6 }}>↳</span> : null}</td>
                        <td style={td}>{app.email}</td>
                        <td style={td}>{JOURNEY_LABELS[app.journey_stage] ?? app.journey_stage}</td>
                        <td style={td}>{app.working_with_attorney ? ATTORNEY_LABELS[app.working_with_attorney] ?? app.working_with_attorney : '—'}</td>
                        <td style={td}>{new Date(app.created_at).toLocaleDateString()}</td>
                        <td style={td}>
                          <span style={{ background: STATUS_COLORS[app.status] || '#6b7280', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{STATUS_LABELS[app.status] ?? app.status}</span>
                        </td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => setSelected(app)} style={btnGhost}>View</button>
                            {app.status === 'pending' && (
                              <>
                                <button onClick={() => decide(app.id, 'approved')} style={btnPrimary}>Approve</button>
                                <button onClick={() => decide(app.id, 'deferred')} style={btnGhost}>Defer</button>
                                <button onClick={() => decide(app.id, 'declined')} style={btnDanger}>Decline</button>
                                <button onClick={() => decide(app.id, 'spots_full')} style={btnSpotsFull} title="Use only when all 10 cohort spots are filled">Spots Full</button>
                              </>
                            )}
                            {app.status === 'approved' && (
                              <button onClick={() => onboard(app.id)} style={btnPrimary}>Mark Onboarded</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'checkins' && (
          <>
            {checkinStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'white', border: '1px solid #C7E4E0', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Open frequency this period</div>
                  {Object.entries(checkinStats.opens_distribution).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>{k} times</span><strong>{v}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'white', border: '1px solid #C7E4E0', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>What they used it for</div>
                  {checkinStats.uses_frequency.length === 0 ? <p style={{ color: '#9ca3af' }}>No data yet.</p> :
                    checkinStats.uses_frequency.map(([label, n]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span>{label}</span><strong>{n}</strong>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {checkins.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No check-ins yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {checkins.map(c => (
                  <div key={c.id} style={{ background: 'white', border: '1px solid #C7E4E0', borderRadius: 12, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <strong>{c.founding_member_applications.first_name}</strong>
                      <span style={{ color: '#6b7280', fontSize: 13 }}>Week {c.week_number} · {new Date(c.submitted_at).toLocaleDateString()}</span>
                    </div>
                    {c.opens_this_week && <div style={fieldRow}><span style={fieldLabel}>Opens:</span> {c.opens_this_week}</div>}
                    {c.uses_this_week && c.uses_this_week.length > 0 && <div style={fieldRow}><span style={fieldLabel}>Used for:</span> {c.uses_this_week.join(', ')}</div>}
                    {c.most_helpful && <div style={fieldRow}><span style={fieldLabel}>Most helpful:</span> {c.most_helpful}</div>}
                    {c.broken_or_confusing && <div style={fieldRow}><span style={fieldLabel}>Broken/confusing:</span> {c.broken_or_confusing}</div>}
                    {c.wishes_it_did && <div style={fieldRow}><span style={fieldLabel}>Wishes:</span> {c.wishes_it_did}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(31,41,55,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, fontSize: 24, color: '#1F2937' }}>{selected.first_name}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={fieldRow}><span style={fieldLabel}>Email:</span> {selected.email}</div>
            <div style={fieldRow}><span style={fieldLabel}>Journey:</span> {JOURNEY_LABELS[selected.journey_stage] ?? selected.journey_stage}</div>
            <div style={fieldRow}><span style={fieldLabel}>Attorney:</span> {selected.working_with_attorney ? ATTORNEY_LABELS[selected.working_with_attorney] ?? selected.working_with_attorney : 'Not provided'}</div>
            <div style={fieldRow}><span style={fieldLabel}>Will share feedback:</span> {COMMIT_LABELS[selected.can_commit] ?? selected.can_commit}</div>
            <div style={fieldRow}><span style={fieldLabel}>Status:</span> <span style={{ background: STATUS_COLORS[selected.status] || '#6b7280', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{STATUS_LABELS[selected.status] ?? selected.status}</span></div>
            <div style={fieldRow}><span style={fieldLabel}>Created:</span> {new Date(selected.created_at).toLocaleString()}</div>
            {selected.approved_at && <div style={fieldRow}><span style={fieldLabel}>Approved:</span> {new Date(selected.approved_at).toLocaleString()}</div>}
            {selected.access_expires_at && <div style={fieldRow}><span style={fieldLabel}>Access until:</span> {new Date(selected.access_expires_at).toLocaleDateString()}</div>}
            {selected.referrals_sent > 0 && <div style={fieldRow}><span style={fieldLabel}>Referrals sent:</span> {selected.referrals_sent}</div>}
            <h3 style={{ marginTop: 16, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 16 }}>Biggest challenges</h3>
            {Array.isArray(selected.biggest_challenge) ? (
              selected.biggest_challenge.length > 0 ? (
                <ul style={{ background: '#EAF5F3', padding: '12px 12px 12px 32px', borderRadius: 8, lineHeight: 1.5, margin: 0 }}>
                  {challengeKeysToLabels(selected.biggest_challenge).map((label, i) => (
                    <li key={i}>{label}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>(none selected)</p>
              )
            ) : (
              <p style={{ background: '#EAF5F3', padding: 12, borderRadius: 8, lineHeight: 1.5 }}>{selected.biggest_challenge ?? '—'}</p>
            )}
            {selected.biggest_challenge_other && (
              <>
                <h3 style={{ marginTop: 16, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 16 }}>Elaborate</h3>
                <p style={{ background: '#EAF5F3', padding: 12, borderRadius: 8, lineHeight: 1.5 }}>{selected.biggest_challenge_other}</p>
              </>
            )}
            {selected.what_tried_before && (
              <>
                <h3 style={{ marginTop: 16, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 16 }}>What they tried before</h3>
                <p style={{ background: '#EAF5F3', padding: 12, borderRadius: 8, lineHeight: 1.5 }}>{selected.what_tried_before}</p>
              </>
            )}
            {selected.additional_notes && (
              <>
                <h3 style={{ marginTop: 16, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 16 }}>Other notes (legacy)</h3>
                <p style={{ background: '#EAF5F3', padding: 12, borderRadius: 8, lineHeight: 1.5 }}>{selected.additional_notes}</p>
              </>
            )}
            {selected.admin_notes && (
              <>
                <h3 style={{ marginTop: 16, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 16 }}>Admin notes</h3>
                <p style={{ background: '#FAFAF7', border: '1px dashed #C7E4E0', padding: 12, borderRadius: 8, lineHeight: 1.5 }}>{selected.admin_notes}</p>
              </>
            )}
            {selected.status === 'pending' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
                  <button onClick={() => decide(selected.id, 'approved')} style={{ ...btnPrimary, flex: '1 1 100px' }}>Approve</button>
                  <button onClick={() => decide(selected.id, 'deferred')} style={{ ...btnGhost, flex: '1 1 100px' }}>Defer</button>
                  <button onClick={() => decide(selected.id, 'declined')} style={{ ...btnDanger, flex: '1 1 100px' }}>Decline</button>
                </div>
                <button
                  onClick={() => decide(selected.id, 'spots_full')}
                  style={{ ...btnSpotsFull, marginTop: 10, width: '100%' }}
                  title="Use only when all 10 cohort spots are filled"
                >
                  Spots Full (waitlist email)
                </button>
              </>
            )}
            {selected.status === 'approved' && (
              <button onClick={() => onboard(selected.id)} style={{ ...btnPrimary, marginTop: 20, width: '100%' }}>Mark onboarded</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontWeight: 600, color: '#1F2937', fontSize: 13 };
const td: React.CSSProperties = { padding: '12px 14px', color: '#1F2937', verticalAlign: 'middle' };
const fieldRow: React.CSSProperties = { padding: '6px 0', fontSize: 14, lineHeight: 1.5 };
const fieldLabel: React.CSSProperties = { fontWeight: 600, color: '#6b7280', marginRight: 6 };
const btnPrimary: React.CSSProperties = { background: '#2F9D94', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { background: 'white', color: '#1F2937', border: '1px solid #C7E4E0', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnDanger: React.CSSProperties = { background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnSpotsFull: React.CSSProperties = { background: '#E57963', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: 0.2 };
