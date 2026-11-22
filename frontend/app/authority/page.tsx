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
        return <Badge className="bg-[#e8f2ec] text-[#18432d] border border-[#bde2cb] font-mono text-[11px]">Reported</Badge>
      case 'acknowledged':
        return <Badge className="bg-[#ede7dc] text-[#506457] border border-[#ded7cb] font-mono text-[11px]">Acknowledged</Badge>
      case 'in_progress':
        return <Badge className="bg-[#fef4e5] text-[#8c5610] border border-[#f6d7ab] font-mono text-[11px]">In Progress</Badge>
      case 'repaired':
      case 'claimed_repaired':
        return <Badge className="bg-[#eef8eb] text-[#2f6f34] border border-[#cbe8c6] font-mono text-[11px]">Claimed Repaired</Badge>
      case 'verified':
        return <Badge className="bg-[#e6f4ea] text-[#1e5d3a] border border-[#bde0ca] font-mono text-[11px]">Verified Fix</Badge>
      case 'overdue':
        return <Badge className="bg-[#faecea] text-[#912d1e] border border-[#f0c0b8] font-mono text-[11px]">SLA Overdue</Badge>
      case 'failed_verification':
        return <Badge className="bg-[#faecea] text-[#912d1e] border border-[#f0c0b8] font-mono text-[11px]">Failed Verification</Badge>
      default:
        return <Badge variant="outline" className="font-mono text-[11px] text-[#506457] border-[#ded7cb]">{status}</Badge>
    }
  }

  return (
    <>
      <Topbar title="Authority Accountability & Maintenance Tracker" />
      
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {notification && (
          <div className={`p-4 rounded-xl flex items-center justify-between border ${
            notification.type === 'success' 
              ? 'bg-[#e8f2ec] border-[#bde2cb] text-[#18432d]' 
              : 'bg-[#faecea] border-[#f0c0b8] text-[#912d1e]'
          }`}>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-[#207246] shrink-0" />
              <span className="text-sm font-medium">{notification.text}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setNotification(null)}
              className="text-[#506457] hover:text-[#12271c] hover:bg-[#ede7dc] text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Top Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Card className="bg-[#faf8f4] border border-[#ded7cb] p-3 shadow-sm">
            <div className="text-[10px] font-mono text-[#506457] uppercase tracking-wider">Total Reports</div>
            <div className="text-2xl font-mono font-bold text-[#12271c] mt-1">{total}</div>
          </Card>
          <Card className="bg-[#faf8f4] border border-[#ded7cb] p-3 shadow-sm">
            <div className="text-[10px] font-mono text-[#18432d] uppercase tracking-wider">Reported</div>
            <div className="text-2xl font-mono font-bold text-[#1d4231] mt-1">{reported}</div>
          </Card>
          <Card className="bg-[#faf8f4] border border-[#ded7cb] p-3 shadow-sm">
            <div className="text-[10px] font-mono text-[#506457] uppercase tracking-wider">Acknowledged</div>
            <div className="text-2xl font-mono font-bold text-[#12271c] mt-1">{acknowledged}</div>
          </Card>
          <Card className="bg-[#faf8f4] border border-[#ded7cb] p-3 shadow-sm">
            <div className="text-[10px] font-mono text-[#8c5610] uppercase tracking-wider">In Progress</div>
            <div className="text-2xl font-mono font-bold text-[#a86c18] mt-1">{inProgress}</div>
          </Card>
          <Card className="bg-[#faf8f4] border border-[#ded7cb] p-3 shadow-sm">
            <div className="text-[10px] font-mono text-[#2f6f34] uppercase tracking-wider">Claimed Fix</div>
            <div className="text-2xl font-mono font-bold text-[#207246] mt-1">{claimed}</div>
          </Card>
          <Card className="bg-[#faf8f4] border border-[#ded7cb] p-3 shadow-sm">
            <div className="text-[10px] font-mono text-[#1e5d3a] uppercase tracking-wider">Verified Fix</div>
            <div className="text-2xl font-mono font-bold text-[#207246] mt-1">{verified}</div>
          </Card>
          <Card className="bg-[#faf8f4] border border-[#ded7cb] p-3 shadow-sm">
            <div className="text-[10px] font-mono text-[#912d1e] uppercase tracking-wider">Overdue SLA</div>
            <div className="text-2xl font-mono font-bold text-[#912d1e] mt-1">{overdue}</div>
          </Card>
        </div>

        {/* Closed-Loop Municipal Accountability Lifecycle */}
        <Card className="bg-[#faf8f4] border border-[#ded7cb] shadow-sm overflow-hidden">
          <CardHeader className="bg-[#f4efe6] pb-3 border-b border-[#ded7cb]">
            <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-[#12271c]">
              Closed-Loop Municipal Accountability Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 bg-[#faf8f4]">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2 py-1">
              <div className="flex items-center space-x-1.5 font-medium text-[#12271c] bg-[#ede7dc] border border-[#ded7cb] px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-[#12271c] text-[#faf8f4] flex items-center justify-center text-[10px] font-mono">1</span>
                <span>AI Pothole Detected</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#83978a] hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-[#18432d] bg-[#e8f2ec] border border-[#bde2cb] px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-[#1d4231] text-[#faf8f4] flex items-center justify-center text-[10px] font-mono">2</span>
                <span>Auto-Report Sent</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#83978a] hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-[#506457] bg-[#ede7dc] border border-[#ded7cb] px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-[#506457] text-[#faf8f4] flex items-center justify-center text-[10px] font-mono">3</span>
                <span>Acknowledged</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#83978a] hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-[#8c5610] bg-[#fef4e5] border border-[#f6d7ab] px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-[#a86c18] text-[#faf8f4] flex items-center justify-center text-[10px] font-mono">4</span>
                <span>Crews In Progress</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#83978a] hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-[#2f6f34] bg-[#eef8eb] border border-[#cbe8c6] px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-[#207246] text-[#faf8f4] flex items-center justify-center text-[10px] font-mono">5</span>
                <span>Repair Claimed</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#83978a] hidden sm:inline" />
              <div className="flex items-center space-x-1.5 font-medium text-[#1e5d3a] bg-[#e6f4ea] border border-[#bde0ca] px-3 py-1.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-[#1e5d3a] text-[#faf8f4] flex items-center justify-center text-[10px] font-mono">6</span>
                <span>AI Survey Verified</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Action Items & SLA Audits */}
        <Card className="bg-[#faf8f4] border border-[#ded7cb] shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#ded7cb] pb-3 bg-[#f4efe6]">
            <div>
              <CardTitle className="text-base font-bold text-[#12271c]">Maintenance Action Items & SLA Audits</CardTitle>
              <CardDescription className="text-xs text-[#506457]">Direct municipal issue dispatch and proof verification table</CardDescription>
            </div>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs text-[#506457] font-mono">Filter:</span>
              <div className="w-44">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs bg-[#faf8f4] border-[#ded7cb] text-[#12271c]">
                    <SelectValue placeholder="Select Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] text-xs">
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
                className="h-8 w-8 p-0 bg-[#faf8f4] border-[#ded7cb] text-[#12271c] hover:bg-[#ede7dc]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-[#506457] flex items-center justify-center font-mono text-xs">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#1d4231]" />
                Loading authority issue database...
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="p-12 text-center text-[#506457] font-mono text-xs">No issues found matching filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] font-mono text-[#506457] uppercase bg-[#f4efe6] border-b border-[#ded7cb]">
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
                  <tbody className="divide-y divide-[#ede7dc] font-mono">
                    {filteredIssues.map((issue) => (
                      <tr key={issue.issue_id} className="hover:bg-[#f4efe6] transition-colors">
                        <td className="px-5 py-4 font-bold text-xs text-[#1d4231]">
                          {issue.issue_id}
                        </td>
                        <td className="px-5 py-4 font-sans">
                          <div className="font-semibold text-[#12271c]">{issue.road_name}</div>
                          <div className="text-xs text-[#506457]">{issue.sub_name}</div>
                        </td>
                        <td className="px-5 py-4 font-sans">
                          <div className="text-xs font-medium text-[#12271c]">{issue.authority_name}</div>
                          <div className="text-[11px] text-[#506457] font-mono">{issue.authority_id}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={
                            issue.priority === 'High' 
                              ? 'border-[#f0c0b8] text-[#912d1e] bg-[#faecea] text-[10px]' 
                              : 'border-[#f6d7ab] text-[#8c5610] bg-[#fef4e5] text-[10px]'
                          }>
                            {issue.priority}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          {getStatusBadge(issue.status)}
                          {issue.status === 'overdue' && (
                            <div className="text-[10px] text-[#912d1e] font-semibold mt-1">
                              21-day SLA Breached
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-[#506457]">
                          {issue.sent_at ? issue.sent_at.split('T')[0] : 'Pending'}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2 font-sans">
                          {issue.status === 'reported' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={actionInProgress === issue.issue_id}
                              onClick={() => handleUpdateStatus(issue.issue_id, 'acknowledged')}
                              className="text-xs h-8 bg-[#faf8f4] border-[#ded7cb] text-[#12271c] hover:bg-[#ede7dc]"
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
                              className="text-xs h-8 bg-[#fef4e5] border-[#f6d7ab] text-[#8c5610] hover:bg-[#fae7c8]"
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
                              className="text-xs h-8 bg-[#eef8eb] border-[#cbe8c6] text-[#2f6f34] hover:bg-[#d8eed3]"
                            >
                              Claim Repaired
                            </Button>
                          )}
                          {['repaired', 'claimed_repaired'].includes(issue.status) && (
                            <Button 
                              size="sm" 
                              disabled={actionInProgress === issue.issue_id}
                              onClick={() => handleTriggerVerification(issue.issue_id)}
                              className="text-xs h-8 bg-[#1d4231] hover:bg-[#153325] text-[#faf8f4] font-medium"
                            >
                              Verify Repair
                            </Button>
                          )}
                          {issue.status === 'verified' && (
                            <span className="text-xs text-[#207246] font-medium inline-flex items-center font-mono">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-[#207246]" />
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
            <Card key={auth.authority_id} className="bg-[#faf8f4] p-4 border border-[#ded7cb] hover:border-[#1d4231] transition-colors shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Building2 className="h-4 w-4 text-[#1d4231]" />
                <div className="font-semibold text-sm text-[#12271c] truncate">{auth.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#ded7cb] mt-2 font-mono">
                <div>
                  <span className="text-[#506457]">Open:</span>
                  <span className="font-bold ml-1 text-[#12271c]">{auth.open_issues}</span>
                </div>
                <div>
                  <span className="text-[#506457]">Overdue:</span>
                  <span className="font-bold ml-1 text-[#912d1e]">{auth.overdue_issues}</span>
                </div>
                <div>
                  <span className="text-[#506457]">Verified:</span>
                  <span className="font-bold ml-1 text-[#207246]">{auth.verified_repairs}</span>
                </div>
                <div>
                  <span className="text-[#506457]">Avg SLA:</span>
                  <span className="font-bold ml-1 text-[#12271c]">
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
