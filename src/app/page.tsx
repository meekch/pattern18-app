'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface DashboardStats {
  totalIncidents: number
  violations: number
  thisMonth: number
  flaggedForCourt: number
  patternsDetected: number
}

interface RecentActivity {
  id: string
  type: 'incident' | 'violation' | 'communication'
  title: string
  date: string
  severity?: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 0,
    violations: 0,
    thisMonth: 0,
    flaggedForCourt: 0,
    patternsDetected: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [needsAttention, setNeedsAttention] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      // Get incidents
      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')
        .order('incident_date', { ascending: false })

      if (incidents) {
        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const violations = incidents.filter(i => i.is_violation)
        const thisMonth = incidents.filter(i => new Date(i.incident_date) >= thisMonthStart)
        const flagged = incidents.filter(i => i.include_in_filing)
        
        // Count unique patterns
        const allPatterns = incidents.flatMap(i => i.pattern_tags || [])
        const uniquePatterns = new Set(allPatterns)

        setStats({
          totalIncidents: incidents.length,
          violations: violations.length,
          thisMonth: thisMonth.length,
          flaggedForCourt: flagged.length,
          patternsDetected: uniquePatterns.size
        })

        // Recent activity
        setRecentActivity(
          incidents.slice(0, 5).map(i => ({
            id: i.id,
            type: i.is_violation ? 'violation' : 'incident',
            title: i.title,
            date: i.incident_date,
            severity: i.severity
          }))
        )

        // Needs attention
        const attention: string[] = []
        const incidentsWithoutEvidence = incidents.filter(i => !i.evidence_summary)
        if (incidentsWithoutEvidence.length > 0) {
          attention.push(`${incidentsWithoutEvidence.length} incidents need evidence attached`)
        }
        if (violations.length > 0 && flagged.length === 0) {
          attention.push('No violations flagged for court filing yet')
        }
        setNeedsAttention(attention)
      }

      setLoading(false)
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Your documentation overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.totalIncidents}</div>
            <div className="text-sm text-gray-500">Total Incidents</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">{stats.violations}</div>
            <div className="text-sm text-gray-500">Violations</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{stats.thisMonth}</div>
            <div className="text-sm text-gray-500">This Month</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">{stats.patternsDetected}</div>
            <div className="text-sm text-gray-500">Patterns</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">{stats.flaggedForCourt}</div>
            <div className="text-sm text-gray-500">Flagged for Court</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Needs Attention */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-yellow-500">⚠️</span> Needs Attention
            </h2>
            {needsAttention.length > 0 ? (
              <ul className="space-y-3">
                {needsAttention.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">All caught up! ✓</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <ul className="space-y-3">
                {recentActivity.map(activity => (
                  <li key={activity.id} className="flex items-start gap-3 text-sm">
                    <span className={`mt-0.5 ${
                      activity.type === 'violation' ? 'text-red-500' : 'text-yellow-500'
                    }`}>
                      {activity.type === 'violation' ? '🔴' : '🟡'}
                    </span>
                    <div>
                      <div className="text-gray-900">{activity.title}</div>
                      <div className="text-gray-500 text-xs">{activity.date}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No activity yet</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/calendar"
                className="block w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
              >
                📅 View Calendar
              </Link>
              <Link
                href="/incidents"
                className="block w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium"
              >
                🚨 Log New Incident
              </Link>
              <Link
                href="/upload"
                className="block w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-sm font-medium"
              >
                📄 Upload Court Order
              </Link>
              <Link
                href="/communications"
                className="block w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
              >
                💬 Log Communication
              </Link>
            </div>
          </div>
        </div>

        {/* Good Faith Tracker Preview */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Good Faith Summary</h2>
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">--</div>
              <div className="text-xs text-gray-600">Accommodations Made</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">--</div>
              <div className="text-xs text-gray-600">Compromises Offered</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">--</div>
              <div className="text-xs text-gray-600">Avg Response Time</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">--</div>
              <div className="text-xs text-gray-600">Makeup Time Offered</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Good Faith tracking coming soon - proves you're the reasonable parent
          </p>
        </div>
      </div>
    </div>
  )
}