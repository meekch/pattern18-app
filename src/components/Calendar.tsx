'use client'

import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns'

interface CalendarEvent {
  id: string
  title: string
  event_date: string
  event_type: string
  severity?: string
  violates_court_order?: boolean
  color_code?: string
  scheduled_parent?: string // 'mother' or 'father'
}

interface CalendarProps {
  events: CalendarEvent[]
  onDateClick?: (date: string) => void
}

export default function Calendar({ events, onDateClick }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const getEventColor = (event: CalendarEvent) => {
    // Violations always red
    if (event.violates_court_order || event.event_type === 'violation') {
      return 'bg-red-500'
    }
    
    // Custom color if specified
    if (event.color_code) {
      return event.color_code
    }

    // Parent-based coloring
    if (event.scheduled_parent === 'mother') {
      if (event.event_type === 'holiday') return 'bg-blue-400'
      if (event.event_type === 'vacation') return 'bg-blue-300'
      return 'bg-blue-500' // Mom's regular time
    }
    
    if (event.scheduled_parent === 'father') {
      if (event.event_type === 'holiday') return 'bg-green-400'
      if (event.event_type === 'vacation') return 'bg-green-300'
      return 'bg-green-500' // Dad's regular time
    }

    // Default by event type
    switch (event.event_type) {
      case 'mom_time': return 'bg-blue-500'
      case 'dad_time': return 'bg-green-500'
      case 'mom_holiday': return 'bg-blue-400'
      case 'dad_holiday': return 'bg-green-400'
      case 'mom_vacation': return 'bg-blue-300'
      case 'dad_vacation': return 'bg-green-300'
      case 'court_ordered_schedule': return 'bg-blue-500'
      case 'incident': return 'bg-yellow-500'
      case 'holiday': return 'bg-purple-500'
      case 'vacation': return 'bg-teal-500'
      case 'exchange': return 'bg-orange-500'
      case 'pc_recommendation': return 'bg-indigo-500'
      default: return 'bg-gray-500'
    }
  }

  const renderHeader = () => (
    <div className="flex justify-between items-center mb-4">
      <button
        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        ← Prev
      </button>
      <h2 className="text-xl font-bold">
        {format(currentMonth, 'MMMM yyyy')}
      </h2>
      <button
        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Next →
      </button>
    </div>
  )

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>
    )
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayEvents = events.filter(e => e.event_date === dayStr)
        const isCurrentMonth = isSameMonth(day, monthStart)
        const isToday = isSameDay(day, new Date())

        days.push(
          <div
            key={day.toString()}
            onClick={() => onDateClick?.(dayStr)}
            className={`min-h-[100px] border p-1 cursor-pointer hover:bg-gray-100 ${
              !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } ${isToday ? 'border-blue-500 border-2' : 'border-gray-200'}`}
          >
            <div className="text-right text-sm mb-1">
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className={`${getEventColor(event)} text-white text-xs p-1 rounded truncate cursor-pointer hover:opacity-80`}
                  title={event.title}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      )
      days = []
    }

    return <div>{rows}</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      
      {/* Legend */}
      <div className="mt-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Legend:</div>
        <div className="flex flex-wrap gap-3 text-sm">
          {/* Parenting Time */}
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Mom's Time</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Dad's Time</span>
          </div>
          
          {/* Holidays */}
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-400 rounded"></div>
            <span>Mom's Holiday</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span>Dad's Holiday</span>
          </div>
          
          {/* Incidents & Violations */}
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Incident</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Violation</span>
          </div>
          
          {/* Other */}
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Exchange</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span>PC Recommendation</span>
          </div>
        </div>
      </div>
    </div>
  )
}