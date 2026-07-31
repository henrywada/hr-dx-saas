'use client'

import { useState } from 'react'
import { TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ScormPackagePanel } from './ScormPackagePanel'
import { XapiStatementsPanel } from './XapiStatementsPanel'
import { SlideEditorClient } from './SlideEditorClient'
import { CourseRequirementMappingPanel } from './CourseRequirementMappingPanel'
import { CoursePreviewButton } from './CoursePreviewButton'
import type { ElCourseWithSlides } from '../types'
import type { ElScormPackage, ElXapiStatementRow } from '../scorm-queries'

type Mapping = {
  id: string
  requirement_id: string
  requirement: { id: string; name: string; skill: { id: string; name: string } }
}

type Requirement = { id: string; name: string; skill_id: string; skill_name: string }

interface Props {
  course: ElCourseWithSlides
  mappings: Mapping[]
  allRequirements: Requirement[]
  scormPackage: ElScormPackage | null
  xapiStatements: ElXapiStatementRow[]
}

type TabKey = 'materials' | 'skills' | 'scorm'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'materials', label: '教材の編集' },
  { key: 'skills', label: 'スキル要件との連携' },
  { key: 'scorm', label: 'SCORM、xAPI' },
]

export function ElCourseDetailTabs({
  course,
  mappings,
  allRequirements,
  scormPackage,
  xapiStatements,
}: Props) {
  const contentFormat = course.content_format ?? 'native'
  const [activeTab, setActiveTab] = useState<TabKey>(
    contentFormat === 'native' ? 'materials' : 'scorm'
  )

  return (
    <div className="space-y-4">
      <TabsList>
        {TABS.map(tab => (
          <TabsTrigger
            key={tab.key}
            selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {activeTab === 'materials' &&
        (contentFormat === 'native' ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <CoursePreviewButton course={course} />
            </div>
            <SlideEditorClient course={course} />
          </div>
        ) : (
          <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-xs">
            現在は外部コンテンツ形式のため、スライド編集はできません。編集するには「SCORM、xAPI」タブから自社スライド形式に戻してください。
          </p>
        ))}

      {activeTab === 'skills' && (
        <CourseRequirementMappingPanel
          courseId={course.id}
          mappings={mappings}
          allRequirements={allRequirements}
        />
      )}

      {activeTab === 'scorm' && (
        <div className="space-y-6">
          <ScormPackagePanel
            courseId={course.id}
            contentFormat={contentFormat}
            packageInfo={scormPackage}
          />
          <XapiStatementsPanel statements={xapiStatements} />
        </div>
      )}
    </div>
  )
}
