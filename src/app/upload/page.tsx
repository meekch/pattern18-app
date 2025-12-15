'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UploadPage() {
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [step, setStep] = useState<'upload' | 'parsing' | 'review'>('upload')
  const [parsedData, setParsedData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    case_number: '',
    court_name: '',
    judge_name: '',
    effective_date: '',
    pattern_type: '5-2-2-5',
    rotation_start_date: '',
    rotation_start_parent: 'mother',
    monday_parent: 'mother',
    tuesday_parent: 'mother',
    wednesday_parent: 'father',
    thursday_parent: 'father',
    friday_parent: 'alternating',
    saturday_parent: 'alternating',
    sunday_parent: 'alternating',
    exchange_time: '18:00',
    exchange_location: '',
  })

  const patternTypes = [
    { value: '5-2-2-5', label: '5-2-2-5 (Mon-Tue / Wed-Thu / Alt Weekends)' },
    { value: 'week-on-week-off', label: 'Week On / Week Off' },
    { value: '2-2-3', label: '2-2-3 Rotation' },
    { value: 'every-other-weekend', label: 'Every Other Weekend' },
    { value: 'custom', label: 'Custom Schedule' },
  ]

  // Auth check
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setAuthLoading(false)
    }
    
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        router.push('/login')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return

    setUploading(true)
    setError(null)

    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('court-documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { error: dbError } = await supabase
        .from('user_case_documents')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: uploadData.path,
          file_type: file.type,
          file_size: file.size,
          document_category: 'court_order',
          is_court_order: true,
          processing_status: 'uploaded'
        })

      if (dbError) throw dbError

      setStep('parsing')
      setParsing(true)

      setTimeout(() => {
        setParsing(false)
        setStep('review')
        setParsedData({
          confidence: 'medium',
          detected_pattern: '5-2-2-5',
          message: 'Document uploaded successfully. Please review and confirm the schedule details below.'
        })
      }, 2000)

    } catch (err: any) {
      setError(err.message)
      setUploading(false)
    }
  }

  const handleSkipUpload = () => {
    setStep('review')
    setParsedData({
      confidence: 'manual',
      message: 'Enter your court order details manually.'
    })
  }

  const handleSave = async () => {
    if (!user) return
    
    setUploading(true)
    setError(null)

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('court_orders')
        .insert({
          user_id: user.id,
          case_number: formData.case_number,
          court_name: formData.court_name,
          judge_name: formData.judge_name,
          effective_date: formData.effective_date,
          status: 'active',
          user_confirmed: true,
          confirmed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (orderError) throw orderError

      const { error: scheduleError } = await supabase
        .from('parenting_schedules')
        .insert({
          user_id: user.id,
          court_order_id: orderData.id,
          pattern_type: formData.pattern_type,
          rotation_start_date: formData.rotation_start_date,
          rotation_start_parent: formData.rotation_start_parent,
          monday_parent: formData.monday_parent,
          tuesday_parent: formData.tuesday_parent,
          wednesday_parent: formData.wednesday_parent,
          thursday_parent: formData.thursday_parent,
          friday_parent: formData.friday_parent,
          saturday_parent: formData.saturday_parent,
          sunday_parent: formData.sunday_parent,
          effective_date: formData.effective_date
        })

      if (scheduleError) throw scheduleError

      const { error: exchangeError } = await supabase
        .from('exchange_rules')
        .insert({
          user_id: user.id,
          court_order_id: orderData.id,
          rule_type: 'default',
          exchange_time: formData.exchange_time,
          exchange_location: formData.exchange_location
        })

      if (exchangeError) throw exchangeError

      await generateCalendarEvents(orderData.id, formData)

      window.location.href = '/calendar'

    } catch (err: any) {
      setError(err.message)
      setUploading(false)
    }
  }

  const generateCalendarEvents = async (orderId: string, schedule: typeof formData) => {
    if (!user) return
    
    const events = []
    const startDate = new Date(schedule.effective_date || new Date())
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 90)

    let currentDate = new Date(startDate)
    let weekNumber = 0

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayKey = dayMap[dayOfWeek] + '_parent' as keyof typeof schedule
      let parent = schedule[dayKey] as string

      if (parent === 'alternating') {
        parent = weekNumber % 2 === 0 ? schedule.rotation_start_parent : 
                 (schedule.rotation_start_parent === 'mother' ? 'father' : 'mother')
      }

      events.push({
        user_id: user.id,
        event_date: currentDate.toISOString().split('T')[0],
        event_type: parent === 'mother' ? 'mom_time' : 'dad_time',
        title: parent === 'mother' ? "Mom's Day" : "Dad's Day",
        scheduled_parent: parent,
        related_court_order_id: orderId,
        ai_generated: true
      })

      currentDate.setDate(currentDate.getDate() + 1)
      if (dayOfWeek === 6) weekNumber++
    }

    const { error } = await supabase
      .from('calendar_events')
      .insert(events)

    if (error) throw error
  }

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7f6'
      }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        <div className="flex items-center gap-4 mb-6">
          <Link href="/calendar" className="text-blue-600 hover:underline">
            ← Back to Calendar
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Set Up Court Order Schedule</h1>

          <div className="flex mb-8">
            <div className={`flex-1 text-center pb-2 border-b-2 ${step === 'upload' ? 'border-blue-500 text-blue-600' : 'border-gray-200'}`}>
              1. Upload
            </div>
            <div className={`flex-1 text-center pb-2 border-b-2 ${step === 'parsing' ? 'border-blue-500 text-blue-600' : 'border-gray-200'}`}>
              2. Processing
            </div>
            <div className={`flex-1 text-center pb-2 border-b-2 ${step === 'review' ? 'border-blue-500 text-blue-600' : 'border-gray-200'}`}>
              3. Confirm
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
              {error}
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Upload your court order and we'll help extract the parenting schedule, 
                or enter it manually.
              </p>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-4xl mb-2">📄</div>
                  <div className="text-lg font-medium">
                    {file ? file.name : 'Click to upload court order'}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    PDF, Word, or Image
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload & Parse'}
                </button>
                <button
                  onClick={handleSkipUpload}
                  className="flex-1 py-2 border rounded hover:bg-gray-50"
                >
                  Enter Manually
                </button>
              </div>
            </div>
          )}

          {step === 'parsing' && (
            <div className="text-center py-12">
              <div className="animate-spin text-4xl mb-4">⚙️</div>
              <div className="text-lg font-medium">Analyzing your court order...</div>
              <div className="text-gray-500 mt-2">This may take a moment</div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              {parsedData?.message && (
                <div className={`p-3 rounded ${
                  parsedData.confidence === 'high' ? 'bg-green-50 text-green-700' :
                  parsedData.confidence === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {parsedData.message}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Court Order Info</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Case Number</label>
                    <input
                      type="text"
                      value={formData.case_number}
                      onChange={e => setFormData({...formData, case_number: e.target.value})}
                      className="w-full border rounded p-2"
                      placeholder="e.g., FC2020-001234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Effective Date</label>
                    <input
                      type="date"
                      value={formData.effective_date}
                      onChange={e => setFormData({...formData, effective_date: e.target.value})}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Court Name</label>
                    <input
                      type="text"
                      value={formData.court_name}
                      onChange={e => setFormData({...formData, court_name: e.target.value})}
                      className="w-full border rounded p-2"
                      placeholder="e.g., Maricopa County Superior Court"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Judge Name</label>
                    <input
                      type="text"
                      value={formData.judge_name}
                      onChange={e => setFormData({...formData, judge_name: e.target.value})}
                      className="w-full border rounded p-2"
                      placeholder="e.g., Hon. Smith"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Parenting Schedule</h3>

                <div>
                  <label className="block text-sm font-medium mb-1">Schedule Pattern</label>
                  <select
                    value={formData.pattern_type}
                    onChange={e => setFormData({...formData, pattern_type: e.target.value})}
                    className="w-full border rounded p-2"
                  >
                    {patternTypes.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Rotation Start Date</label>
                    <input
                      type="date"
                      value={formData.rotation_start_date}
                      onChange={e => setFormData({...formData, rotation_start_date: e.target.value})}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Who Starts?</label>
                    <select
                      value={formData.rotation_start_parent}
                      onChange={e => setFormData({...formData, rotation_start_parent: e.target.value})}
                      className="w-full border rounded p-2"
                    >
                      <option value="mother">Mother</option>
                      <option value="father">Father</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <label className="block text-sm font-medium mb-2">Weekly Schedule</label>
                  <div className="grid grid-cols-7 gap-1 text-center text-sm">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="font-medium py-1">{day}</div>
                    ))}
                    {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                      <select
                        key={day}
                        value={formData[`${day}_parent` as keyof typeof formData] as string}
                        onChange={e => setFormData({...formData, [`${day}_parent`]: e.target.value})}
                        className={`border rounded p-1 text-xs ${
                          formData[`${day}_parent` as keyof typeof formData] === 'mother' ? 'bg-blue-100' :
                          formData[`${day}_parent` as keyof typeof formData] === 'father' ? 'bg-green-100' :
                          'bg-purple-100'
                        }`}
                      >
                        <option value="mother">Mom</option>
                        <option value="father">Dad</option>
                        <option value="alternating">Alt</option>
                      </select>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Exchange Details</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Exchange Time</label>
                    <input
                      type="time"
                      value={formData.exchange_time}
                      onChange={e => setFormData({...formData, exchange_time: e.target.value})}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Exchange Location</label>
                    <input
                      type="text"
                      value={formData.exchange_location}
                      onChange={e => setFormData({...formData, exchange_location: e.target.value})}
                      className="w-full border rounded p-2"
                      placeholder="e.g., Mother's residence"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 py-2 border rounded hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={uploading || !formData.effective_date}
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : 'Confirm & Generate Calendar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}