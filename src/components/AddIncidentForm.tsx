'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AddIncidentFormProps {
  selectedDate?: string
  onClose: () => void
  onSaved: () => void
}

export default function AddIncidentForm({ selectedDate, onClose, onSaved }: AddIncidentFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    incident_date: selectedDate || new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    is_violation: false,
    violation_type: '',
    severity: 'medium',
    child_present: false,
    child_impact_description: '',
    pattern_tags: [] as string[]
  })

  const patterns = [
    { key: 'gaslighting', name: 'Gaslighting' },
    { key: 'darvo', name: 'DARVO' },
    { key: 'schedule_manipulation', name: 'Schedule Manipulation' },
    { key: 'boundary_violations', name: 'Boundary Violations' },
    { key: 'intimidation', name: 'Intimidation' },
    { key: 'triangulation', name: 'Triangulation' },
    { key: 'litigation_abuse', name: 'Litigation Abuse' },
    { key: 'financial_control', name: 'Financial Control' },
  ]

  const violationTypes = [
    { value: 'late_exchange', label: 'Late Exchange' },
    { value: 'early_return', label: 'Early Return' },
    { value: 'no_show', label: 'No Show' },
    { value: 'wrong_location', label: 'Wrong Location' },
    { value: 'communication', label: 'Communication Violation' },
    { value: 'other', label: 'Other' },
  ]

  const togglePattern = (key: string) => {
    setForm(prev => ({
      ...prev,
      pattern_tags: prev.pattern_tags.includes(key)
        ? prev.pattern_tags.filter(p => p !== key)
        : [...prev.pattern_tags, key]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('incidents')
      .insert({
        user_id: 'test-user', // Replace with real auth later
        incident_date: form.incident_date,
        title: form.title,
        description: form.description,
        is_violation: form.is_violation,
        violation_type: form.is_violation ? form.violation_type : null,
        severity: form.severity,
        child_present: form.child_present,
        child_impact_description: form.child_present ? form.child_impact_description : null,
        pattern_tags: form.pattern_tags,
      })

    setLoading(false)

    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      onSaved()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Log Incident</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={form.incident_date}
                onChange={e => setForm({...form, incident_date: e.target.value})}
                className="w-full border rounded p-2"
                required
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">What happened? (brief)</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                placeholder="e.g., Late pickup, Hostile text message"
                className="w-full border rounded p-2"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Details</label>
              <textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Describe what happened..."
                className="w-full border rounded p-2 h-24"
              />
            </div>

            {/* Is Violation */}
            <div className="bg-red-50 p-3 rounded">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_violation}
                  onChange={e => setForm({...form, is_violation: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="font-medium">This violates a court order or PC recommendation</span>
              </label>

              {form.is_violation && (
                <div className="mt-2">
                  <select
                    value={form.violation_type}
                    onChange={e => setForm({...form, violation_type: e.target.value})}
                    className="w-full border rounded p-2"
                  >
                    <option value="">Select violation type...</option>
                    {violationTypes.map(v => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <div className="flex gap-2">
                {['low', 'medium', 'high', 'critical'].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm({...form, severity: level})}
                    className={`px-3 py-1 rounded capitalize ${
                      form.severity === level
                        ? level === 'low' ? 'bg-gray-500 text-white'
                        : level === 'medium' ? 'bg-yellow-500 text-white'
                        : level === 'high' ? 'bg-orange-500 text-white'
                        : 'bg-red-600 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Child Present */}
            <div className="bg-blue-50 p-3 rounded">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.child_present}
                  onChange={e => setForm({...form, child_present: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="font-medium">Child was present/witnessed</span>
              </label>

              {form.child_present && (
                <div className="mt-2">
                  <textarea
                    value={form.child_impact_description}
                    onChange={e => setForm({...form, child_impact_description: e.target.value})}
                    placeholder="How was the child affected?"
                    className="w-full border rounded p-2 h-16"
                  />
                </div>
              )}
            </div>

            {/* Patterns */}
            <div>
              <label className="block text-sm font-medium mb-2">Patterns Identified</label>
              <div className="flex flex-wrap gap-2">
                {patterns.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePattern(p.key)}
                    className={`px-3 py-1 rounded text-sm ${
                      form.pattern_tags.includes(p.key)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Incident'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}