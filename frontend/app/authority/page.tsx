"use client"

import React, { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
        return <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono text-[11px]">Reported</Badge>
      case 'acknowledged':
        return <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono text-[11px]">Acknowledged</Badge>
      case 'in_progress':
        return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-[11px]">In Progress</Badge>
      case 'repaired':
      case 'claimed_repaired':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[11px]">Claimed Repaired</Badge>
      case 'verified':
        return <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/30 font-mono text-[11px]">Verified Fix</Badge>
      case 'overdue':
        return <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono text-[11px]">SLA Overdue</Badge>
      case 'failed_verification':
        return <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 font-mono text-[11px]">Failed Verification</Badge>
      default:
        return <Badge variant="outline" className="font-mono text-[11px] text-slate-400 border-slate-700">{status}</Badge>
    }
  }

  return (
    <>
      <Topbar title="Authority Accountability & Maintenance Tracker" />
      
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {notification && (
          <div className={`p-4 rounded-lg flex items-center justify-between border ${
            notification.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium">{notification.text}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Top Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Card className="bg-[#0f172a] border border-slate-800 p-3 shadow-sm">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Reports</div>
            <div className="text-2xl font-mono font-bold text-slate-100 mt-1">{total}</div>
          </Card>
          <Card className="bg-[#090d16] border border-slate-800 p-3 shadow-sm">
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">Reported</div>
            <div className="text-2xl font-mono font-bold text-blue-400 mt-1">{reported}</div>
          </Card>
          <Card className="bg-[#090d16] border border-slate-800 p-3 shadow-sm">
            <div className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Acknowledged</div>
            <div className="text-2xl font-mono font-bold text-purple-400 mt-1">{acknowledged}</div>
          </Card>
          <Card className="bg-[#090d16] border border-slate-800 p-3 shadow-sm">
            <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">In Progress</div>
            <div className="text-2xl font-mono font-bold text-amber-400 mt-1">{inProgress}</div>
          </Card>
          <Card className="bg-[#090d16] border border-slate-800 p-3 shadow-sm">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Claimed Fix</div>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{claimed}</div>
          </Card>
          <Card className="bg-[#090d16] border border-slate-800 p-3 shadow-sm">
            <div className="text-[10px] font-mono text-teal-400 uppercase tracking-wider">Verified Fix</div>
            <div className="text-2xl font-mono font-bold text-teal-400 mt-1">{verified}</div>
          </Card>
          <Card className="bg-[#090d16] border border-slate-800 p-3 shadow-sm">
            <div className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">Overdue SLA</div>
            <div className="text-2xl font-mono font-bold text-rose-400 mt-1">{overdue}</div>
          </Card>
        </div>

        {/* Closed-Loop Municipal Accountability Lifecycle */}
        <Card className="bg-[#090d16] border border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-[#0f172a] pb-3 border-b border-slate-800/80">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
              Closed-Loop Municipal Accountability Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 bg-[#090d16]">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2 py-1">
              <div className="flex items-center space-x-1.5 font-medium text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-mono">1</span>
                <span>AI Pothole Detected</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-blue-400 bg-blue-950/40 border border-blue-800/60 px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center text-[10px] font-mono">2</span>
                <span>Auto-Report Sent</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-purple-400 bg-purple-950/40 border border-purple-800/60 px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-purple-900 text-purple-300 flex items-center justify-center text-[10px] font-mono">3</span>
                <span>Acknowledged</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-amber-900 text-amber-300 flex items-center justify-center text-[10px] font-mono">4</span>
                <span>Crews In Progress</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-emerald-900 text-emerald-300 flex items-center justify-center text-[10px] font-mono">5</span>
                <span>Repair Claimed</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-teal-400 bg-teal-950/40 border border-teal-800/60 px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-teal-900 text-teal-300 flex items-center justify-center text-[10px] font-mono">6</span>
                <span>AI Survey Verified</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Action Items & SLA Audits */}
        <Card className="bg-[#090d16] border border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-100">Maintenance Action Items & SLA Audits</CardTitle>
              <CardDescription className="text-xs text-slate-400">Direct municipal issue dispatch and proof verification table</CardDescription>
            </div>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-mono">Filter:</span>
              <div className="w-44">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs bg-[#0f172a] border-slate-700 text-slate-200">
                    <SelectValue placeholder="Select Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f172a] border-slate-700 text-slate-200 text-xs">
                    <SelectItem value="all">All Issues ({total})</SelectItem>
                    <SelectItem value="open">Active / Unresolved</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="repaired">Claimed Repaired</SelectItem>
                    <SelectItem value="verified">Verified Fix</SelectItem>
                    <SelectItem value="overdue">SLA Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadData}
                className="h-8 w-8 p-0 bg-[#0f172a] border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center font-mono text-xs">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-cyan-400" />
                Loading authority issue database...
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">No issues found matching filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] font-mono text-slate-400 uppercase bg-[#0f172a] border-b border-slate-800">
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
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredIssues.map((issue) => (
                      <tr key={issue.issue_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4 font-bold text-xs text-slate-200">
                          {issue.issue_id}
                        </td>
                        <td className="px-5 py-4 font-sans">
                          <div className="font-semibold text-slate-100">{issue.road_name}</div>
                          <div className="text-xs text-slate-400">{issue.sub_name}</div>
                        </td>
                        <td className="px-5 py-4 font-sans">
                          <div className="text-xs font-medium text-slate-200">{issue.authority_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{issue.authority_id}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={
                            issue.priority === 'High' 
                              ? 'border-rose-500/40 text-rose-400 bg-rose-950/20 text-[10px]' 
                              : 'border-amber-500/40 text-amber-400 bg-amber-950/20 text-[10px]'
                          }>
                            {issue.priority}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          {getStatusBadge(issue.status)}
                          {issue.status === 'overdue' && (
                            <div className="text-[10px] text-rose-400 font-semibold mt-1">
                              21-day SLA Breached
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {issue.sent_at ? issue.sent_at.split('T')[0] : 'Pending'}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2 font-sans">
                          {issue.status === 'reported' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={actionInProgress === issue.issue_id}
                              onClick={() => handleUpdateStatus(issue.issue_id, 'acknowledged')}
                              className="text-xs h-8 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
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
                              className="text-xs h-8 bg-amber-950/20 border-amber-800/60 text-amber-400 hover:bg-amber-900/40"
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
                              className="text-xs h-8 bg-emerald-950/20 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/40"
                            >
                              Claim Repaired
                            </Button>
                          )}
                          {['repaired', 'claimed_repaired'].includes(issue.status) && (
                            <Button 
                              size="sm" 
                              disabled={actionInProgress === issue.issue_id}
                              onClick={() => handleTriggerVerification(issue.issue_id)}
                              className="text-xs h-8 bg-teal-600 hover:bg-teal-500 text-white font-medium"
                            >
                              Verify Repair
                            </Button>
                          )}
                          {issue.status === 'verified' && (
                            <span className="text-xs text-teal-400 font-medium inline-flex items-center font-mono">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-teal-400" />
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

        {/* Authority Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary?.by_authority?.map((auth: any) => (
            <Card key={auth.authority_id} className="bg-[#090d16] p-4 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center space-x-2 mb-2">
                <Building2 className="h-4 w-4 text-cyan-400" />
                <div className="font-semibold text-sm text-slate-100 truncate">{auth.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800 mt-2 font-mono">
                <div>
                  <span className="text-slate-400">Open:</span>
                  <span className="font-bold ml-1 text-slate-200">{auth.open_issues}</span>
                </div>
                <div>
                  <span className="text-slate-400">Overdue:</span>
                  <span className="font-bold ml-1 text-rose-400">{auth.overdue_issues}</span>
                </div>
                <div>
                  <span className="text-slate-400">Verified:</span>
                  <span className="font-bold ml-1 text-teal-400">{auth.verified_repairs}</span>
                </div>
                <div>
                  <span className="text-slate-400">Avg SLA:</span>
                  <span className="font-bold ml-1 text-slate-300">
                    {auth.avg_response_days !== null && auth.avg_response_days !== undefined
                      ? `${auth.avg_response_days}d`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

      </div>
    </>
  )
}
