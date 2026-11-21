import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Database,
  ClipboardPaste,
  History,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { ExcelCsvFetcherTab } from '../components/contactFetcher/ExcelCsvFetcherTab';
import { DatabaseFetcherTab } from '../components/contactFetcher/DatabaseFetcherTab';
import { ManualPasteTab } from '../components/contactFetcher/ManualPasteTab';
import { OperationHistoryTab } from '../components/contactFetcher/OperationHistoryTab';
import { RecipientReadinessTab } from '../components/contactFetcher/RecipientReadinessTab';
import { GroupAssignmentModal } from '../components/contactFetcher/GroupAssignmentModal';
import { FetchSourceType } from '../types';

export const ContactFetcherPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'excel-csv' | 'database' | 'manual' | 'history' | 'readiness'>('excel-csv');

  // Group Assignment Modal state
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [candidateIdsToAssign, setCandidateIdsToAssign] = useState<string[]>([]);
  const [currentSourceType, setCurrentSourceType] = useState<FetchSourceType>('EXCEL');

  const handleLaunchAssignment = (ids: string[], source: FetchSourceType) => {
    setCandidateIdsToAssign(ids);
    setCurrentSourceType(source);
    setIsAssignmentModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5 flex-wrap">
            <UserCheck className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Contact Fetcher & Candidate Assignment Engine</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized applicant sourcing from spreadsheets, database queries, and raw contact paste with criteria matching.
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-200 bg-white px-2 sm:px-4 rounded-xl border shadow-xs overflow-x-auto no-scrollbar -mx-2 sm:mx-0">
        <nav className="flex space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar min-w-max pb-px">
          <button
            onClick={() => setActiveTab('excel-csv')}
            className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'excel-csv'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            1. Excel & CSV Import
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'database'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-4 h-4 text-blue-600" />
            2. Database Fetcher
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardPaste className="w-4 h-4 text-purple-600" />
            3. Manual Contact Paste
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4 text-slate-600" />
            Operation History
          </button>

          <button
            onClick={() => setActiveTab('readiness')}
            className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'readiness'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            WhatsApp Recipient Readiness
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'excel-csv' && (
        <ExcelCsvFetcherTab
          onAssignCandidates={(ids) => handleLaunchAssignment(ids, 'EXCEL')}
        />
      )}

      {activeTab === 'database' && (
        <DatabaseFetcherTab
          onAssignCandidates={(ids) => handleLaunchAssignment(ids, 'DATABASE')}
        />
      )}

      {activeTab === 'manual' && (
        <ManualPasteTab
          onAssignCandidates={(ids) => handleLaunchAssignment(ids, 'MANUAL_PASTE')}
        />
      )}

      {activeTab === 'history' && <OperationHistoryTab />}

      {activeTab === 'readiness' && <RecipientReadinessTab />}

      {/* Shared Group Assignment Modal */}
      <GroupAssignmentModal
        isOpen={isAssignmentModalOpen}
        selectedCandidateIds={candidateIdsToAssign}
        sourceType={currentSourceType}
        onClose={() => setIsAssignmentModalOpen(false)}
        onSuccess={() => {
          // Handled inside modal report view
        }}
      />
    </div>
  );
};

