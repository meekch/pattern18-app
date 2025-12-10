'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Communication {
  id: string
  communication_date: string
  communication_time: string
  direction: 'sent' | 'received'
  method: string
  subject: string
  summary: string
  response_required: boolean
  response_received: boolean
  response_time_hours: number | null
  tone: string
  good_faith_flag: boolean
  good_faith_type: string
}

interface CommStats {
  totalSent: number
  totalReceived: number
  avgResponseTimeYou: number
  avgResponseTimeThem: number
  ignoredByThem: number
  goodFaithCount: number
}

export default function CommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [stats, setStats] = useState<CommStats>({
    totalSent: 0,
    totalReceived: 0,
    avgResponseTimeYou: 0,
    avgResponseTimeThem: 0,
    ignoredByThem: 0,
    goodFaithCount: 0
  })
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    communication_date: new Date().toISOString().split('T')[0],
    communication_time: '',
    direction: 'sent',
    method: 'text',
    subject: '',
    summary: '',
    full_content: '',
    response_required: false,
    tone: 'neutral',
    good_faith_flag: false,
    good_faith_type: ''
  })

  useEffect(() => {
    loadCommunications()
  }, [])

  async function loadCommunications() {
    const { data } = await supabase
      .from('communications')
      .select('*')
      .order('communication_date', { ascending: false })
      .order('communication_time', { ascending: false })

    if (data) {
      setCommunications(data)
      calculateStats(data)
    }
    setLoading(false)
  }

  function calculateStats(data: Communication[]) {
    const sent = data.filter(c => c.direction === 'sent')
    const received = data.filter(c => c.direction === 'received')
    
    // Messages you sent that required response but got none
    const ignored = sent.filter(c => c.response_required && !c.response_received)
    
    // Good faith efforts
    const goodFaith = data.filter(c => c.good_faith_flag)
    
    // Average response times (simplified for now)
    const theirResponses = sent.filter(c => c.response_received && c.response_time_hours)
    const avgThem = theirResponses.length > 0 
      ? theirResponses.reduce((sum, c) => sum + (c.response_time_hours || 0), 0) / theirResponses.length
      : 0

    setStats({
      totalSent: sent.length,
      totalReceived: received.length,
      avgResponseTimeYou: 0, // TODO: calculate from received messages
      avgResponseTimeThem: Math.round(avgThem),
      ignoredByThem: ignored.length,
      goodFaithCount: goodFaith.length
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const { error } = await supabase
      .from('communications')
      .insert([formData])

    if (!error) {
      setShowForm(false)
      setFormData({
        communication_date: new Date().toISOString().split('T')[0],
        communication_time: '',
        direction: 'sent',
        method: 'text',
        subject: '',
        summary: '',
        full_content: '',
        response_required: false,
        tone: 'neutral',
        good_faith_flag: false,
        good_faith_type: ''
      })
      loadCommunications()
    }
  }

  function formatResponseTime(hours: number | null) {
    if (!hours) return '--'
    if (hours < 1) return '< 1 hour'
    if (hours < 24) return `${hours} hours`
    const days = Math.round(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading communications...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Communication Log</h1>
            <p className="text-gray-600 mt-1">Track all communications with response times</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Log Communication
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalSent}</div>
            <div className="text-xs text-gray-500">Sent by You</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalReceived}</div>
            <div className="text-xs text-gray-500">Received</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatResponseTime(stats.avgResponseTimeThem)}
            </div>
            <div className="text-xs text-gray-500">Their Avg Response</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.ignoredByThem}</div>
            <div className="text-xs text-gray-500">Ignored by Them</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.goodFaithCount}</div>
            <div className="text-xs text-gray-500">Good Faith Efforts</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {stats.totalSent > 0 ? Math.round((stats.totalSent / (stats.totalSent + stats.totalReceived)) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500">You Initiate</div>
          </div>
        </div>

        {/* Communication Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Log Communication</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.communication_date}
                      onChange={e => setFormData({...formData, communication_date: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.communication_time}
                      onChange={e => setFormData({...formData, communication_time: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                    <select
                      value={formData.direction}
                      onChange={e => setFormData({...formData, direction: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="sent">I Sent</option>
                      <option value="received">I Received</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select
                      value={formData.method}
                      onChange={e => setFormData({...formData, method: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="text">Text Message</option>
                      <option value="email">Email</option>
                      <option value="app">Co-Parent App (OFW, etc)</option>
                      <option value="phone">Phone Call</option>
                      <option value="in_person">In Person</option>
                      <option value="voicemail">Voicemail</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject/Topic</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Schedule change request, Medical appointment"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                  <textarea
                    value={formData.summary}
                    onChange={e => setFormData({...formData, summary: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    placeholder="Brief description of the communication"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Content (optional)</label>
                  <textarea
                    value={formData.full_content}
                    onChange={e => setFormData({...formData, full_content: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={4}
                    placeholder="Paste the full message text here for your records"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Their Tone</label>
                  <select
                    value={formData.tone}
                    onChange={e => setFormData({...formData, tone: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="cooperative">Cooperative</option>
                    <option value="hostile">Hostile/Aggressive</option>
                    <option value="manipulative">Manipulative</option>
                    <option value="dismissive">Dismissive</option>
                    <option value="threatening">Threatening</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.response_required}
                      onChange={e => setFormData({...formData, response_required: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Response Required</span>
                  </label>
                </div>

                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={formData.good_faith_flag}
                      onChange={e => setFormData({...formData, good_faith_flag: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-green-700">✓ This shows good faith effort</span>
                  </label>
                  {formData.good_faith_flag && (
                    <select
                      value={formData.good_faith_type}
                      onChange={e => setFormData({...formData, good_faith_type: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select type...</option>
                      <option value="accommodation">Offered Accommodation</option>
                      <option value="compromise">Proposed Compromise</option>
                      <option value="makeup_time">Offered Makeup Time</option>
                      <option value="flexibility">Showed Flexibility</option>
                      <option value="resolution">Attempted Resolution</option>
                    </select>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save Communication
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Communications List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Communication History</h2>
          </div>
          {communications.length > 0 ? (
            <div className="divide-y">
              {communications.map(comm => (
                <div key={comm.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 text-lg ${comm.direction === 'sent' ? 'text-blue-500' : 'text-green-500'}`}>
                      {comm.direction === 'sent' ? '📤' : '📥'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{comm.subject || 'No subject'}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{comm.method}</span>
                        {comm.good_faith_flag && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Good Faith ✓</span>
                        )}
                        {comm.tone === 'hostile' && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Hostile</span>
                        )}
                        {comm.tone === 'manipulative' && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Manipulative</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{comm.summary}</p>
                      <div className="text-xs text-gray-400 mt-2">
                        {comm.communication_date} {comm.communication_time && `at ${comm.communication_time}`}
                        {comm.response_required && !comm.response_received && (
                          <span className="ml-2 text-red-500">• Awaiting response</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No communications logged yet.</p>
              <p className="text-sm mt-1">Start tracking to build your evidence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}