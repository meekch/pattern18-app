'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Calendar from '@/components/Calendar'
import AddIncidentForm from '@/components/AddIncidentForm'

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>()

  const fetchData = async () => {
    // Fetch calendar events
    const { data: calendarData, error: calendarError } = await supabase
      .from('calendar_events')
      .select('id, event_date, event_type, title, scheduled_parent')

    if (calendarError) console.log('Calendar error:', calendarError)

    // Fetch incidents
    const { data: incidentData, error: incidentError } = await supabase
      .from('incidents')
      .select('*')
      .order('incident_date', { ascending: false })

    if (incidentError) console.log('Incident error:', incidentError)

    setEvents(calendarData || [])
    setIncidents(incidentData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Combine events and incidents for calendar display
  const calendarEvents = [
    ...events,
    ...incidents.map(inc => ({
      id: inc.id,
      title: inc.title,
      event_date: inc.incident_date,
      event_type: inc.is_violation ? 'violation' : 'incident',
      severity: inc.severity
    }))
  ]

  const handleAddIncident = (date?: string) => {
    setSelectedDate(date)
    setShowAddForm(true)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Pattern 18 Calendar</h1>
        <button
          onClick={() => handleAddIncident()}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          + Log Incident
        </button>
      </div>

      <Calendar events={calendarEvents} onDateClick={handleAddIncident} />

      {/* Recent Incidents */}
      {incidents.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="font-bold text-lg mb-3">Recent Incidents</h2>
          <div className="space-y-2">
            {incidents.slice(0, 5).map(inc => (
              <div 
                key={inc.id} 
                className={`p-3 rounded border-l-4 ${
                  inc.is_violation ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{inc.title}</span>
                  <span className="text-sm text-gray-500">{inc.incident_date}</span>
                </div>
                {inc.pattern_tags?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {inc.pattern_tags.map((tag: string) => (
                      <span key={tag} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <AddIncidentForm
          selectedDate={selectedDate}
          onClose={() => setShowAddForm(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}