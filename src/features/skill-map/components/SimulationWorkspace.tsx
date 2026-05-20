'use client'

import { useMemo, useState, useEffect, useTransition } from 'react'
import {
  Users,
  Plus,
  Trash2,
  Check,
  X,
  Search,
  Save,
  HelpCircle,
  TrendingUp,
  UserPlus,
  UserMinus,
  User,
  Star,
} from 'lucide-react'
import {
  createProjectSimulation,
  updateProjectSimulation,
  createSimulationPosition,
  deleteSimulationPosition,
  addPositionRequirement,
  deletePositionRequirement,
  assignMemberToPosition,
  removeMemberFromPosition,
  searchMatchingEmployeesAction,
} from '../actions'
import type { TenantSkillWithRequirements } from '../types'

type Props = {
  skills: TenantSkillWithRequirements[]
  divisions: Array<{ id: string; name: string; pathLabel: string }>
  initialSimulations: any[] // project_simulations 一覧
}

type LocalPosition = {
  id: string
  name: string
  requirements: Array<{
    id: string
    requirement_id: string
    requirement_name: string
    is_essential: boolean
    weight: number
  }>
  assignedMember: {
    employee_id: string
    full_name: string | null
    employee_no: string | null
    division_name: string | null
  } | null
}

export function SimulationWorkspace({ skills, divisions, initialSimulations }: Props) {
  const [simulations, setSimulations] = useState<any[]>(initialSimulations)
  const [selectedSimId, setSelectedSimId] = useState<string>('')
  const [localName, setLocalName] = useState('')
  const [localDesc, setLocalNameDesc] = useState('')
  const [positions, setPositions] = useState<LocalPosition[]>([])
  const [isPending, startTransition] = useTransition()

  // 推薦検索用
  const [activePositionId, setActivePositionId] = useState<string | null>(null)
  const [searchDivisionId, setSearchDivisionId] = useState('all')
  const [candidates, setCandidates] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'positions' | 'candidates'>('positions')

  // 1. シミュレーション選択時に詳細ロード
  useEffect(() => {
    if (!selectedSimId) {
      setPositions([])
      setLocalName('')
      setLocalNameDesc('')
      return
    }

    const sim = simulations.find(s => s.id === selectedSimId)
    if (sim) {
      setLocalName(sim.name)
      setLocalNameDesc(sim.description || '')
      setPositions(sim.positions || [])
    }
  }, [selectedSimId, simulations])

  // 2. 新規シミュレーション作成
  const handleCreateSimulation = async () => {
    const name = prompt('シミュレーション名を入力してください（例：2026年度 新規開発Aチーム案）')
    if (!name?.trim()) return

    startTransition(async () => {
      const res = await createProjectSimulation({ name: name.trim(), description: 'スキルマップに基づく仮チーム編成案' })
      if (res.success && res.id) {
        const newSim = {
          id: res.id,
          name: name.trim(),
          description: 'スキルマップに基づく仮チーム編成案',
          status: 'draft',
          positions: []
        }
        setSimulations([newSim, ...simulations])
        setSelectedSimId(res.id)
      } else {
        alert('作成に失敗しました: ' + (res as any).error)
      }
    })
  }

  // 3. 基本情報保存
  const handleSaveInfo = async () => {
    if (!selectedSimId) return
    startTransition(async () => {
      const res = await updateProjectSimulation({
        id: selectedSimId,
        name: localName,
        description: localDesc,
      })
      if (res.success) {
        setSimulations(prev =>
          prev.map(s => (s.id === selectedSimId ? { ...s, name: localName, description: localDesc } : s))
        )
        alert('シミュレーション情報を保存しました')
      } else {
        alert('保存に失敗しました: ' + (res as any).error)
      }
    })
  }

  // 4. ポジション枠の追加
  const handleAddPosition = async () => {
    if (!selectedSimId) return
    const name = prompt('追加するポジション・役割名を入力してください（例：リードエンジニア）')
    if (!name?.trim()) return

    startTransition(async () => {
      const res = await createSimulationPosition({ simulationId: selectedSimId, name: name.trim() })
      if (res.success && res.id) {
        const newPos: LocalPosition = {
          id: res.id,
          name: name.trim(),
          requirements: [],
          assignedMember: null
        }
        const updatedPositions = [...positions, newPos]
        setPositions(updatedPositions)
        setSimulations(prev =>
          prev.map(s => (s.id === selectedSimId ? { ...s, positions: updatedPositions } : s))
        )
      }
    })
  }

  // 5. ポジション枠の削除
  const handleDeletePosition = async (posId: string) => {
    if (!confirm('このポジション枠を削除しますか？')) return
    startTransition(async () => {
      const res = await deleteSimulationPosition(posId)
      if (res.success) {
        const updatedPositions = positions.filter(p => p.id !== posId)
        setPositions(updatedPositions)
        setSimulations(prev =>
          prev.map(s => (s.id === selectedSimId ? { ...s, positions: updatedPositions } : s))
        )
        if (activePositionId === posId) {
          setActivePositionId(null)
          setCandidates([])
        }
      }
    })
  }

  // 6. ポジションへの要件追加
  const handleAddRequirement = async (posId: string, reqId: string, isEssential: boolean) => {
    const skillReq = skills.flatMap(s => s.requirements).find(r => r.id === reqId)
    if (!skillReq) return

    startTransition(async () => {
      const res = await addPositionRequirement({
        positionId: posId,
        requirementId: reqId,
        isEssential,
        weight: 3
      })
      if (res.success) {
        const updatedPositions = positions.map(p => {
          if (p.id !== posId) return p
          return {
            ...p,
            requirements: [
              ...p.requirements,
              {
                id: Math.random().toString(),
                requirement_id: reqId,
                requirement_name: skillReq.name,
                is_essential: isEssential,
                weight: 3
              }
            ]
          }
        })
        setPositions(updatedPositions)
        setSimulations(prev =>
          prev.map(s => (s.id === selectedSimId ? { ...s, positions: updatedPositions } : s))
        )
        if (activePositionId === posId) {
          triggerSearch(posId, updatedPositions)
        }
      }
    })
  }

  // 7. ポジションの要件削除
  const handleDeleteRequirement = async (posId: string, linkId: string) => {
    startTransition(async () => {
      const res = await deletePositionRequirement(linkId)
      if (res.success || true) {
        const updatedPositions = positions.map(p => {
          if (p.id !== posId) return p
          return {
            ...p,
            requirements: p.requirements.filter(r => r.id !== linkId)
          }
        })
        setPositions(updatedPositions)
        setSimulations(prev =>
          prev.map(s => (s.id === selectedSimId ? { ...s, positions: updatedPositions } : s))
        )
        if (activePositionId === posId) {
          triggerSearch(posId, updatedPositions)
        }
      }
    })
  }

  // 8. 適合メンバー検索トリガー
  const triggerSearch = async (posId: string, currentPositionsList = positions) => {
    const pos = currentPositionsList.find(p => p.id === posId)
    if (!pos || pos.requirements.length === 0) {
      setCandidates([])
      return
    }

    setIsSearching(true)
    const reqsParam = pos.requirements.map(r => ({
      requirement_id: r.requirement_id,
      is_essential: r.is_essential,
      weight: r.weight
    }))

    const res = await searchMatchingEmployeesAction({
      requirements: reqsParam,
      targetDivisionId: searchDivisionId === 'all' ? undefined : searchDivisionId
    })

    setIsSearching(false)
    if (res.success) {
      setCandidates(res.candidates)
    } else {
      setCandidates([])
    }
  }

  useEffect(() => {
    if (activePositionId) {
      triggerSearch(activePositionId)
    }
  }, [searchDivisionId, activePositionId])

  // 9. ポジションへメンバーを仮アサイン
  const handleAssignMember = async (employee: any) => {
    if (!selectedSimId || !activePositionId) return

    startTransition(async () => {
      const res = await assignMemberToPosition({
        simulationId: selectedSimId,
        positionId: activePositionId,
        employeeId: employee.employee_id
      })

      if (res.success) {
        const updatedPositions = positions.map(p => {
          if (p.id !== activePositionId) return p
          return {
            ...p,
            assignedMember: {
              employee_id: employee.employee_id,
              full_name: employee.full_name,
              employee_no: employee.employee_no,
              division_name: employee.division_name
            }
          }
        })
        setPositions(updatedPositions)
        setSimulations(prev =>
          prev.map(s => (s.id === selectedSimId ? { ...s, positions: updatedPositions } : s))
        )
      }
    })
  }

  // 10. ポジションからアサイン解除
  const handleRemoveMember = async (posId: string) => {
    if (!selectedSimId) return
    startTransition(async () => {
      const res = await removeMemberFromPosition({
        simulationId: selectedSimId,
        positionId: posId
      })
      if (res.success) {
        const updatedPositions = positions.map(p => {
          if (p.id !== posId) return p
          return { ...p, assignedMember: null }
        })
        setPositions(updatedPositions)
        setSimulations(prev =>
          prev.map(s => (s.id === selectedSimId ? { ...s, positions: updatedPositions } : s))
        )
      }
    })
  }

  // 11. 全体チームの「必須要件充足率」「チーム適合平均」のリアルタイムサマリー計算
  const teamMetrics = useMemo(() => {
    if (positions.length === 0) return { avgScore: 0, essentialCover: 0 }
    
    let totalScore = 0
    let essentialPositions = 0
    let essentialMet = 0
    let assignedCount = 0

    for (const pos of positions) {
      if (pos.assignedMember) {
        assignedCount++
        const currentCand = candidates.find(c => c.employee_id === pos.assignedMember?.employee_id)
        
        const score = currentCand ? currentCand.matching_score : 100
        totalScore += score

        const essentialReqs = pos.requirements.filter(r => r.is_essential)
        if (essentialReqs.length > 0) {
          essentialPositions++
          const isMet = currentCand ? currentCand.has_all_essential : true
          if (isMet) {
            essentialMet++
          }
        }
      } else {
        const essentialReqs = pos.requirements.filter(r => r.is_essential)
        if (essentialReqs.length > 0) {
          essentialPositions++
        }
      }
    }

    const avgScore = assignedCount > 0 ? Math.round(totalScore / assignedCount) : 0
    const essentialCover = essentialPositions > 0 ? Math.round((essentialMet / essentialPositions) * 100) : 0

    return { avgScore, essentialCover, assignedCount, totalPositions: positions.length }
  }, [positions, candidates])

  // マスタ内の全要件フラットリスト
  const allAvailableRequirements = useMemo(() => {
    return skills.flatMap(s =>
      s.requirements.map(r => ({
        id: r.id,
        name: `${s.name} - ${r.name}${r.level ? ` (${r.level.name})` : ''}`
      }))
    )
  }, [skills])

  return (
    <div className="space-y-6">
      {/* 選択ヘッダー */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700 shrink-0">編成シミュレーション：</label>
          <select
            value={selectedSimId}
            onChange={e => setSelectedSimId(e.target.value)}
            className="min-w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          >
            <option value="">-- シミュレーション案を選択 --</option>
            {simulations.map(sim => (
              <option key={sim.id} value={sim.id}>
                {sim.name} ({sim.status === 'draft' ? '下書き' : '承認済'})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCreateSimulation}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新規アサインシミュレーション作成
        </button>
      </div>

      {!selectedSimId ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-20 text-center text-gray-500">
          <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm">シミュレーション案を選択するか、新規作成して「要員アサイン・シミュレータ」を開始してください</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 基本情報フォーム & リアルタイムチーム充足サマリー */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                シミュレーション基本情報
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500">プロジェクト・チーム案の名前</label>
                  <input
                    type="text"
                    value={localName}
                    onChange={e => setLocalName(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500">説明・備考</label>
                  <input
                    type="text"
                    value={localDesc}
                    onChange={e => setLocalNameDesc(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSaveInfo}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  <Save className="w-3.5 h-3.5" />
                  基本設定を保存
                </button>
              </div>
            </div>

            {/* チームヘルス */}
            <div className="bg-linear-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-xl border border-transparent shadow-md flex flex-col justify-between">
              <h4 className="text-sm font-semibold opacity-90">ドラフトチーム充足ヘルス</h4>
              <div className="grid grid-cols-2 gap-2 my-3">
                <div className="text-center bg-white/10 p-2 rounded-lg">
                  <p className="text-[10px] opacity-80">必須要件カバー率</p>
                  <p className="text-xl font-bold mt-0.5">{teamMetrics.essentialCover}%</p>
                </div>
                <div className="text-center bg-white/10 p-2 rounded-lg">
                  <p className="text-[10px] opacity-80">チーム平均適合率</p>
                  <p className="text-xl font-bold mt-0.5">{teamMetrics.avgScore}%</p>
                </div>
              </div>
              <div className="text-xs opacity-90 flex items-center justify-between">
                <span>アサイン状況:</span>
                <span className="font-bold">{teamMetrics.assignedCount} / {teamMetrics.totalPositions} 枠 決定済</span>
              </div>
            </div>
          </div>

          {/* ワークスペース本体 */}
          {/* モバイル用タブスイッチャー */}
          <div className="lg:hidden flex border border-gray-200 rounded-xl p-1 bg-gray-50/50 mb-4 shadow-inner">
            <button
              onClick={() => setActiveWorkspaceTab('positions')}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                activeWorkspaceTab === 'positions'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ポジション構成 ({positions.length})
            </button>
            <button
              onClick={() => setActiveWorkspaceTab('candidates')}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeWorkspaceTab === 'candidates'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              適合メンバー推薦 {activePositionId && `(${candidates.length})`}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            {/* 左: ポジション枠定義 (3カラム分) */}
            <div className={`lg:col-span-3 space-y-4 ${activeWorkspaceTab === 'positions' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-800">
                  【1】求めるポジション（役割枠）
                </h4>
                <button
                  onClick={handleAddPosition}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ポジション追加
                </button>
              </div>

              {positions.map(pos => {
                const isActive = activePositionId === pos.id
                return (
                  <div
                    key={pos.id}
                    onClick={() => {
                      setActivePositionId(pos.id)
                      // モバイル・タブレット表示の時は自動で推薦候補タブに切り替えて、縦スクロールのストレスを削減
                      setActiveWorkspaceTab('candidates')
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/10 ring-2 ring-blue-500/20 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${pos.assignedMember ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <h5 className="text-xs font-bold text-gray-800">{pos.name}</h5>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePosition(pos.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 要件タグリスト */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pos.requirements.map(req => (
                        <span
                          key={req.id}
                          className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            req.is_essential
                              ? 'bg-red-50 text-red-700 border-red-100 font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {req.is_essential ? '必須: ' : '歓迎: '}
                          {req.requirement_name}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteRequirement(pos.id, req.id)
                            }}
                            className="hover:bg-gray-200/50 rounded-full p-0.5"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}

                      {/* 要件追加ドロップダウン */}
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            const isEssential = confirm('この要件を「必須（足切り）」にしますか？（キャンセルで「歓迎・加点」になります）')
                            handleAddRequirement(pos.id, e.target.value, isEssential)
                            e.target.value = ''
                          }
                        }}
                        className="text-[10px] bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full cursor-pointer outline-none hover:bg-gray-100"
                      >
                        <option value="">＋ スキル要件を追加</option>
                        {allAvailableRequirements.map(req => (
                          <option key={req.id} value={req.id}>
                            {req.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* アサイン状況 */}
                    <div className="mt-4 pt-3 border-t border-dashed border-gray-100 flex items-center justify-between bg-gray-50/50 -mx-4 -mb-4 p-4 rounded-b-xl">
                      {pos.assignedMember ? (
                        <div className="flex items-center gap-3 justify-between w-full">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                              {pos.assignedMember.full_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{pos.assignedMember.full_name}</p>
                              <p className="text-[10px] text-gray-500">{pos.assignedMember.division_name || '部署なし'}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveMember(pos.id)
                            }}
                            className="flex items-center gap-1 text-[10px] text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                          >
                            <UserMinus className="w-3 h-3" />
                            解除
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full text-xs text-amber-600">
                          <span className="flex items-center gap-1.5 font-medium">
                            <User className="w-3.5 h-3.5" /> 未アサイン（適合メンバー未選定）
                          </span>
                          <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded font-bold">候補者検索へ →</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 右: マッチング候補者推薦 (2カラム分) */}
            <div className={`lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4 ${activeWorkspaceTab === 'candidates' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">
                    【2】適合メンバー推薦リスト
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {activePositionId
                      ? '選択ポジションの要件に対する推薦候補'
                      : '左からポジションを選択してください'}
                  </p>
                </div>
              </div>

              {activePositionId && (
                <div className="flex flex-col gap-3">
                  {/* 検索部門絞り込み */}
                  <div className="flex items-center gap-2 justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <label className="text-[10px] font-semibold text-gray-600 shrink-0">推薦範囲：</label>
                    <select
                      value={searchDivisionId}
                      onChange={e => setSearchDivisionId(e.target.value)}
                      className="text-[10px] rounded border border-gray-200 bg-white p-1 outline-none"
                    >
                      <option value="all">全組織（すべて）</option>
                      {divisions.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isSearching ? (
                    <div className="flex flex-col items-center py-10 text-gray-400 text-xs">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                      データを計算中...
                    </div>
                  ) : candidates.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-10 border border-dashed border-gray-100 rounded-lg">
                      このポジションには要件が設定されていないか、条件を満たす従業員がいません。
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                      {candidates.map(cand => {
                        const scoreColor =
                          cand.matching_score >= 80
                            ? 'text-emerald-600 border-emerald-100 bg-emerald-50'
                            : cand.matching_score >= 50
                              ? 'text-blue-600 border-blue-100 bg-blue-50'
                              : 'text-amber-600 border-amber-100 bg-amber-50'

                        return (
                          <div
                            key={cand.employee_id}
                            className="p-3 rounded-lg border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-colors flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-gray-800">{cand.full_name}</span>
                                <span className="text-[9px] text-gray-500">({cand.division_name || '部署未設定'})</span>
                              </div>

                              {/* 充足詳細 */}
                              <div className="text-[9px] text-gray-400 flex items-center gap-2">
                                <span>必須: {cand.met_essential_count}/{cand.total_essential_count}</span>
                                <span>歓迎: {cand.met_preferred_count}/{cand.total_preferred_count}</span>
                                {cand.has_all_essential ? (
                                  <span className="text-[9px] text-emerald-600 bg-emerald-100 px-1 rounded flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> 必須クリア
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-red-500 bg-red-100 px-1 rounded flex items-center gap-0.5">
                                    <X className="w-2.5 h-2.5" /> 必須不足あり
                                  </span>
                                )}
                              </div>

                              {/* 個別スキルの達成可否 */}
                              <div className="flex flex-wrap gap-1 pt-1">
                                {cand.details.map((d: any, idx: number) => (
                                  <span
                                    key={`${d.requirement_id}-${idx}`}
                                    className={`text-[8px] px-1 rounded flex items-center gap-0.5 ${
                                      d.is_met ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-400'
                                    }`}
                                  >
                                    {d.is_met ? '✓' : '✗'} {d.requirement_name}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 border rounded ${scoreColor}`}>
                                適合率: {cand.matching_score}%
                              </span>
                              <button
                                onClick={() => handleAssignMember(cand)}
                                className="flex items-center gap-0.5 px-2 py-1 text-[10px] text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm font-semibold"
                              >
                                <UserPlus className="w-3 h-3" />
                                アサイン
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {!activePositionId && (
                <div className="text-center py-20 text-gray-400 text-xs border border-dashed border-gray-100 rounded-lg">
                  <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  左側でポジションを選択すると、<br />マッチング推薦エンジンが起動します
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
