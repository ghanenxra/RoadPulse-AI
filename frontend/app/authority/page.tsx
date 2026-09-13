"use client"

import React, { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { IssueReport } from '@/types'
import { 
  Shield, CheckCircle2, Clock, AlertTriangle, XCircle, 
  ArrowRight, Building2, Calendar, FileCheck, RefreshCw, Loader2, Sparkles
} from 'lucide-react'

export default function AuthorityPage() {
  const [issues, setIssues] = useState<IssueReport[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function loadData() {
    try {
      setLoading(true)
      const [issuesData, summaryData] = await Promise.all([
        api.getAuthorityIssues(),
        api.getAuthoritySummary()
      ])
      setIssues(issuesData)
      setSummary(summaryData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateStatus = async (issueId: string, newStatus: string) => {
    try {
      setActionInProgress(issueId)
      await api.updateIssueStatus(issueId, newStatus)
      setNotification({
        type: 'success',
        text: `Issue ${issueId} transition recorded: '${newStatus}'. Municipal SLA ledger updated.`
      })
      await loadData()
    } catch (e: any) {
      setNotification({
        type: 'error',
        text: `Failed to update status: ${e.message}`
      })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleTriggerVerification = async (issueId: string) => {
    try {
      setActionInProgress(issueId)
      const res = await api.triggerVerification(issueId)
      setNotification({
        type: 'success',
        text: `Automated AI survey comparison verified: ${res.result || 'Pass'} (Issue ${issueId}).`
      })
      await loadData()
    } catch (e: any) {
      setNotification({
        type: 'error',
        text: `Verification failed: ${e.message}`
      })
    } finally {
      setActionInProgress(null)
    }
  }

  const filteredIssues = issues.filter(issue => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'open') return ['reported', 'acknowledged', 'in_progress', 'overdue'].includes(issue.status)
    return issue.status === filterStatus
  })

  const total = issues.length
  const reported = issues.filter(i => i.status === 'reported').length
  const acknowledged = issues.filter(i => i.status === 'acknowledged').length
  const inProgress = issues.filter(i => i.status === 'in_progress').length
  const claimed = issues.filter(i => ['repaired', 'claimed_repaired'].includes(i.status)).length
  const verified = issues.filter(i => i.status === 'verified').length
  const overdue = issues.filter(i => i.status === 'overdue').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reported':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Reported</Badge>
      case 'acknowledged':
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Acknowledged</Badge>
      case 'in_progress':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">In Progress</Badge>
      case 'repaired':
      case 'claimed_repaired':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Claimed Repaired</Badge>
      case 'verified':
        return <Badge className="bg-teal-600 hover:bg-teal-700 text-white">Verified</Badge>
      case 'overdue':
        return <Badge className="bg-rose-600 hover:bg-rose-700 text-white">SLA Overdue</Badge>
      case 'failed_verification':
        return <Badge className="bg-red-700 hover:bg-red-800 text-white">Failed Verification</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <Topbar title="Authority Accountability & Maintenance Tracker" />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {notification && (
          <div className={`p-4 rounded-lg flex items-center justify-between ${
            notification.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium">{notification.text}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNotification(null)}>Dismiss</Button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Card className="bg-slate-900 text-white p-3 shadow-sm">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Total Reports</div>
            <div className="text-2xl font-bold mt-1">{total}</div>
          </Card>
          <Card className="p-3 border-l-4 border-l-blue-500 shadow-sm">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Reported</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{reported}</div>
          </Card>
          <Card className="p-3 border-l-4 border-l-purple-500 shadow-sm">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Acknowledged</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{acknowledged}</div>
          </Card>
          <Card className="p-3 border-l-4 border-l-amber-500 shadow-sm">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">In Progress</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{inProgress}</div>
          </Card>
          <Card className="p-3 border-l-4 border-l-emerald-500 shadow-sm">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Claimed Fix</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{claimed}</div>
          </Card>
          <Card className="p-3 border-l-4 border-l-teal-600 shadow-sm">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Verified Fix</div>
            <div className="text-2xl font-bold text-teal-600 mt-1">{verified}</div>
          </Card>
          <Card className="p-3 border-l-4 border-l-rose-600 shadow-sm">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Overdue SLA</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{overdue}</div>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm uppercase tracking-wider text-gray-500">
              Closed-Loop Municipal Accountability Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2 py-2">
              <div className="flex items-center space-x-1.5 font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">1</span>
                <span>AI Pothole Detected</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Auto-Report Sent</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
                <span>Acknowledged</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">4</span>
                <span>Crews In Progress</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">5</span>
                <span>Repair Claimed</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-teal-800 bg-teal-50 px-3 py-1.5 rounded-full">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">6</span>
                <span>AI Survey Verified</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg">Maintenance Action Items & SLA Audits</CardTitle>
              <CardDescription>Direct municipal issue dispatch and proof verification table</CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 font-medium">Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border rounded-md px-2.5 py-1.5 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Issues ({total})</option>
                <option value="open">Active / Unresolved</option>
                <option value="reported">Reported</option>
                <option value="in_progress">In Progress</option>
                <option value="repaired">Claimed Repaired</option>
                <option value="verified">Verified</option>
                <option value="overdue">SLA Overdue</option>
              </select>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-gray-500 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading authority issue database...
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No issues found matching filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-y">
                    <tr>
                      <th className="px-5 py-3">Issue ID</th>
                      <th className="px-5 py-3">Road Segment</th>
                      <th className="px-5 py-3">Authority Responsible</th>
                      <th className="px-5 py-3">Priority</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Sent Date</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredIssues.map((issue) => (
                      <tr key={issue.issue_id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4 font-mono font-bold text-xs text-slate-900">
                          {issue.issue_id}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{issue.road_name}</div>
                          <div className="text-xs text-gray-500">{issue.sub_name}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs font-medium text-slate-800">{issue.authority_name}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{issue.authority_id}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={
                            issue.priority === 'High' ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-amber-300 text-amber-700 bg-amber-50'
                          }>
                            {issue.priority}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          {getStatusBadge(issue.status)}
                          {issue.status === 'overdue' && (
                            <div className="text-[11px] text-rose-600 font-semibold mt-1">
                              21-day SLA Breached
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-600 font-mono">
                          {issue.sent_at ? issue.sent_at.split('T')[0] : 'Pending'}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          {issue.status === 'reported' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={actionInProgress === issue.issue_id}
                              onClick={() => handleUpdateStatus(issue.issue_id, 'acknowledged')}
                              className="text-xs h-8"
                            >
                              Acknowledge
                            </Button>
                          )}
                          {issue.status === 'acknowledged' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={actionInProgress === issue.issue_id}
                              onClick={() => handleUpdateStatus(issue.issue_id, 'in_progress')}
                              className="text-xs h-8 text-amber-700 border-amber-300"
                            >
                              Dispatch Crew
                            </Button>
                          )}
                          {['in_progress', 'overdue'].includes(issue.status) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={actionInProgress === issue.issue_id}
                              onClick={() => handleUpdateStatus(issue.issue_id, 'repaired')}
                              className="text-xs h-8 text-emerald-700 border-emerald-300"
                            >
                              Claim Repaired
                            </Button>
                          )}
                          {['repaired', 'claimed_repaired'].includes(issue.status) && (
                            <Button 
                              size="sm" 
                              disabled={actionInProgress === issue.issue_id}
                              onClick={() => handleTriggerVerification(issue.issue_id)}
                              className="text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              Verify Repair
                            </Button>
                          )}
                          {issue.status === 'verified' && (
                            <span className="text-xs text-teal-700 font-medium inline-flex items-center">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-teal-600" />
                              Audited
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary?.by_authority?.map((auth: any) => (
            <Card key={auth.authority_id} className="p-4 shadow-sm border hover:border-slate-300 transition-colors">
              <div className="flex items-center space-x-2 mb-2">
                <Building2 className="h-4 w-4 text-slate-700" />
                <div className="font-semibold text-sm text-slate-900 truncate">{auth.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t mt-2">
                <div>
                  <span className="text-gray-500">Open Issues:</span>
                  <span className="font-bold ml-1 text-slate-900">{auth.open_issues}</span>
                </div>
                <div>
                  <span className="text-gray-500">Overdue:</span>
                  <span className="font-bold ml-1 text-rose-600">{auth.overdue_issues}</span>
                </div>
                <div>
                  <span className="text-gray-500">Verified Fixes:</span>
                  <span className="font-bold ml-1 text-teal-600">{auth.verified_repairs}</span>
                </div>
                <div>
                  <span className="text-gray-500">Avg SLA:</span>
                  <span className="font-bold ml-1 text-slate-700">{auth.avg_response_days}d</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

      </div>
    </>
  )
}
