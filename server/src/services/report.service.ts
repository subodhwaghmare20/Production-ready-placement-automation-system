import * as XLSX from 'xlsx';
import { Campaign } from '../models/Campaign.model';
import { CampaignRecipient } from '../models/CampaignRecipient.model';
import { Company } from '../models/Company.model';
import { maskPhoneNumber } from '../utils/phoneMask';
import { pdfGeneratorService, PdfColumn, PdfSummaryBox } from './pdfGenerator.service';

export type ReportFormat = 'xlsx' | 'csv' | 'pdf';

export interface ReportFilterOptions {
  campaignId?: string;
  companyId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  unmaskPhone?: boolean;
  generatedBy?: string;
}

export class ReportService {
  /**
   * 1. Campaign Summary Report
   */
  async generateCampaignSummaryReport(
    format: ReportFormat,
    filters: ReportFilterOptions = {}
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const query: Record<string, unknown> = {};
    if (filters.companyId && filters.companyId.match(/^[0-9a-fA-F]{24}$/)) {
      query.companyId = filters.companyId;
    }
    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    const campaigns = await Campaign.find(query)
      .populate('companyId', 'companyName')
      .populate('groupId', 'groupName')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    const rows = campaigns.map((c) => {
      const company = c.companyId as any;
      const group = c.groupId as any;
      const creator = c.createdBy as any;
      const eligible = c.metrics?.eligibleRecipients || 0;
      const confirmed = c.metrics?.manuallyConfirmedCount || 0;
      const progress = eligible > 0 ? `${Math.round((confirmed / eligible) * 100)}%` : '0%';

      return {
        'Campaign ID': c.campaignId,
        'Campaign Name': c.name,
        'Company': company?.companyName || '-',
        'Virtual Group': group?.groupName || '-',
        'Status': c.status,
        'Total Recipients': c.metrics?.totalRecipients || 0,
        'Eligible Recipients': eligible,
        'Confirmed Sends': confirmed,
        'Skipped': c.metrics?.skippedCount || 0,
        'Failed Attempts': c.metrics?.failedCount || 0,
        'Progress': progress,
        'Created Date': c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '-',
        'Created By': creator?.name || 'Administrator',
      };
    });

    const fileName = `Campaign_Summary_Report_${Date.now()}`;
    const disclaimer =
      'Notice: Personal WhatsApp Mode. Messages confirmed by administrator; delivery and read status cannot be independently verified.';

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Campaign Summary');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        buffer,
        fileName: `${fileName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
      return {
        buffer: Buffer.from(csv, 'utf8'),
        fileName: `${fileName}.csv`,
        mimeType: 'text/csv; charset=utf-8',
      };
    }

    // PDF Format
    const columns: PdfColumn[] = [
      { header: 'Campaign Name', key: 'Campaign Name', width: 28 },
      { header: 'Company', key: 'Company', width: 22 },
      { header: 'Status', key: 'Status', width: 14 },
      { header: 'Eligible', key: 'Eligible Recipients', width: 10 },
      { header: 'Confirmed', key: 'Confirmed Sends', width: 12 },
      { header: 'Progress', key: 'Progress', width: 14 },
    ];

    const summaryBoxes: PdfSummaryBox[] = [
      { label: 'Total Campaigns', value: campaigns.length },
      {
        label: 'Eligible Candidates',
        value: campaigns.reduce((s, c) => s + (c.metrics?.eligibleRecipients || 0), 0),
      },
      {
        label: 'Confirmed Sends',
        value: campaigns.reduce((s, c) => s + (c.metrics?.manuallyConfirmedCount || 0), 0),
      },
      {
        label: 'Skipped',
        value: campaigns.reduce((s, c) => s + (c.metrics?.skippedCount || 0), 0),
      },
    ];

    const buffer = pdfGeneratorService.generateReport({
      title: 'Campaign Summary & Outreach Audit Report',
      subtitle: 'Placement Candidate Management System • Confidential',
      generatedBy: filters.generatedBy || 'Administrator',
      summaryBoxes,
      columns,
      rows: rows as any,
      disclaimer,
    });

    return {
      buffer,
      fileName: `${fileName}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  /**
   * 2. Recipient-wise Detailed Report
   */
  async generateRecipientDetailsReport(
    format: ReportFormat,
    filters: ReportFilterOptions = {}
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const query: Record<string, unknown> = {};
    if (filters.campaignId && filters.campaignId.match(/^[0-9a-fA-F]{24}$/)) {
      query.campaignId = filters.campaignId;
    }
    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    const recipients = await CampaignRecipient.find(query)
      .populate('campaignId', 'name campaignId companyId')
      .populate('candidateId', 'candidateId fullName email')
      .populate('lastActionBy', 'name')
      .sort({ queueOrder: 1 })
      .limit(2000); // Guard limit

    // Cache companies
    const companyCache = new Map<string, string>();

    const rows = await Promise.all(
      recipients.map(async (r) => {
        const campaign = r.campaignId as any;
        const candidate = r.candidateId as any;
        const actor = r.lastActionBy as any;

        let compName = 'Unknown Company';
        if (campaign && campaign.companyId) {
          const compIdStr = campaign.companyId.toString();
          if (companyCache.has(compIdStr)) {
            compName = companyCache.get(compIdStr)!;
          } else {
            const comp = await Company.findById(campaign.companyId).select('companyName');
            if (comp) {
              compName = comp.companyName;
              companyCache.set(compIdStr, compName);
            }
          }
        }

        const phone = filters.unmaskPhone
          ? r.phoneNumber
          : maskPhoneNumber(r.phoneNumber);

        const lastActionDate =
          r.manuallyConfirmedAt || r.chatOpenedAt || r.skippedAt || r.updatedAt;

        return {
          'Candidate Name': r.candidateName || candidate?.fullName || '-',
          'Candidate ID': candidate?.candidateId || '-',
          'Company': compName,
          'Campaign': campaign?.name || '-',
          'Phone': phone,
          'WhatsApp Status': r.status,
          'Validation': r.personalizationStatus,
          'Approved': r.isApproved ? 'Yes' : 'No',
          'Last Action Date': lastActionDate
            ? new Date(lastActionDate).toISOString().split('T')[0]
            : '-',
          'Action By': actor?.name || r.lastActionByName || 'Administrator',
          'Error Details': r.errorDetails || r.skipReason || '-',
        };
      })
    );

    const fileName = `Recipient_Details_Report_${Date.now()}`;
    const disclaimer =
      'Notice: Personal WhatsApp Mode. Phone numbers are masked for data privacy unless authorized. Delivery/read status cannot be independently verified.';

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Recipients Tracking');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        buffer,
        fileName: `${fileName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
      return {
        buffer: Buffer.from(csv, 'utf8'),
        fileName: `${fileName}.csv`,
        mimeType: 'text/csv; charset=utf-8',
      };
    }

    // PDF Format
    const columns: PdfColumn[] = [
      { header: 'Candidate Name', key: 'Candidate Name', width: 22 },
      { header: 'Company', key: 'Company', width: 20 },
      { header: 'Phone', key: 'Phone', width: 16 },
      { header: 'WhatsApp Status', key: 'WhatsApp Status', width: 22 },
      { header: 'Approved', key: 'Approved', width: 10 },
      { header: 'Action Date', key: 'Last Action Date', width: 10 },
    ];

    const confirmedCount = rows.filter((r) => r['WhatsApp Status'] === 'SENT_MANUALLY_CONFIRMED').length;
    const skippedCount = rows.filter((r) => r['WhatsApp Status'] === 'SKIPPED').length;
    const readyCount = rows.filter((r) => ['READY', 'PENDING'].includes(r['WhatsApp Status'])).length;

    const summaryBoxes: PdfSummaryBox[] = [
      { label: 'Total Recipients', value: rows.length },
      { label: 'Confirmed Sends', value: confirmedCount },
      { label: 'Skipped', value: skippedCount },
      { label: 'Ready in Queue', value: readyCount },
    ];

    const buffer = pdfGeneratorService.generateReport({
      title: 'Recipient-wise Messaging Audit Report',
      subtitle: 'Placement Candidate Management System • Confidential',
      generatedBy: filters.generatedBy || 'Administrator',
      summaryBoxes,
      columns,
      rows: rows as any,
      disclaimer,
    });

    return {
      buffer,
      fileName: `${fileName}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  /**
   * 3. Company-wise Performance Report
   */
  async generateCompanyPerformanceReport(
    format: ReportFormat,
    filters: ReportFilterOptions = {}
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const campaigns = await Campaign.find()
      .populate('companyId', 'companyName companyId industry')
      .lean();

    const companyMap = new Map<string, any>();

    for (const c of campaigns) {
      const company = c.companyId as any;
      if (!company) continue;
      const compId = company._id ? company._id.toString() : 'UNKNOWN';

      if (!companyMap.has(compId)) {
        companyMap.set(compId, {
          'Company Name': company.companyName || 'Unknown Company',
          'Company ID': company.companyId || compId,
          'Industry': company.industry || 'General',
          campaignsCount: 0,
          totalCandidates: 0,
          eligibleCandidates: 0,
          confirmedSends: 0,
          skippedCandidates: 0,
          failedAttempts: 0,
        });
      }

      const item = companyMap.get(compId)!;
      item.campaignsCount += 1;
      item.totalCandidates += c.metrics?.totalRecipients || 0;
      item.eligibleCandidates += c.metrics?.eligibleRecipients || 0;
      item.confirmedSends += c.metrics?.manuallyConfirmedCount || 0;
      item.skippedCandidates += c.metrics?.skippedCount || 0;
      item.failedAttempts += c.metrics?.failedCount || 0;
    }

    const rows = Array.from(companyMap.values()).map((item) => {
      const rate =
        item.eligibleCandidates > 0
          ? `${Math.round((item.confirmedSends / item.eligibleCandidates) * 100)}%`
          : '0%';
      return {
        'Company Name': item['Company Name'],
        'Company ID': item['Company ID'],
        'Industry': item['Industry'],
        'Total Campaigns': item.campaignsCount,
        'Selected Candidates': item.totalCandidates,
        'Eligible Candidates': item.eligibleCandidates,
        'Confirmed Sends': item.confirmedSends,
        'Skipped': item.skippedCandidates,
        'Failed Attempts': item.failedAttempts,
        'Completion Rate': rate,
      };
    });

    const fileName = `Company_Performance_Report_${Date.now()}`;
    const disclaimer =
      'Notice: Personal WhatsApp Mode. Delivery and read status are unverified; confirmed sends represent administrative confirmations.';

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Company Performance');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        buffer,
        fileName: `${fileName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
      return {
        buffer: Buffer.from(csv, 'utf8'),
        fileName: `${fileName}.csv`,
        mimeType: 'text/csv; charset=utf-8',
      };
    }

    // PDF Format
    const columns: PdfColumn[] = [
      { header: 'Company Name', key: 'Company Name', width: 28 },
      { header: 'Industry', key: 'Industry', width: 18 },
      { header: 'Campaigns', key: 'Total Campaigns', width: 12 },
      { header: 'Eligible', key: 'Eligible Candidates', width: 14 },
      { header: 'Confirmed', key: 'Confirmed Sends', width: 14 },
      { header: 'Completion', key: 'Completion Rate', width: 14 },
    ];

    const summaryBoxes: PdfSummaryBox[] = [
      { label: 'Active Companies', value: rows.length },
      {
        label: 'Total Campaigns',
        value: rows.reduce((s, r) => s + (r['Total Campaigns'] as number), 0),
      },
      {
        label: 'Confirmed Sends',
        value: rows.reduce((s, r) => s + (r['Confirmed Sends'] as number), 0),
      },
    ];

    const buffer = pdfGeneratorService.generateReport({
      title: 'Company Recruitment & Campaign Performance Report',
      subtitle: 'Placement Candidate Management System • Confidential',
      generatedBy: filters.generatedBy || 'Administrator',
      summaryBoxes,
      columns,
      rows: rows as any,
      disclaimer,
    });

    return {
      buffer,
      fileName: `${fileName}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  /**
   * 4. Monthly Activity Report
   */
  async generateMonthlyActivityReport(
    format: ReportFormat,
    filters: ReportFilterOptions = {}
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const campaigns = await Campaign.find().sort({ createdAt: 1 });

    const monthMap = new Map<
      string,
      {
        month: string;
        created: number;
        completed: number;
        recipients: number;
        confirmed: number;
        skipped: number;
        failed: number;
      }
    >();

    for (const c of campaigns) {
      const d = new Date(c.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          created: 0,
          completed: 0,
          recipients: 0,
          confirmed: 0,
          skipped: 0,
          failed: 0,
        });
      }

      const item = monthMap.get(monthKey)!;
      item.created++;
      if (c.status === 'COMPLETED') item.completed++;
      item.recipients += c.metrics?.eligibleRecipients || c.metrics?.totalRecipients || 0;
      item.confirmed += c.metrics?.manuallyConfirmedCount || 0;
      item.skipped += c.metrics?.skippedCount || 0;
      item.failed += c.metrics?.failedCount || 0;
    }

    const rows = Array.from(monthMap.values()).map((m) => ({
      'Month': m.month,
      'Campaigns Created': m.created,
      'Campaigns Completed': m.completed,
      'Recipients Volume': m.recipients,
      'Confirmed Sends': m.confirmed,
      'Skipped': m.skipped,
      'Failed Attempts': m.failed,
    }));

    const fileName = `Monthly_Activity_Report_${Date.now()}`;
    const disclaimer =
      'Notice: Personal WhatsApp Mode. Monthly volumes are aggregated from database campaign records.';

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Activity');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        buffer,
        fileName: `${fileName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
      return {
        buffer: Buffer.from(csv, 'utf8'),
        fileName: `${fileName}.csv`,
        mimeType: 'text/csv; charset=utf-8',
      };
    }

    // PDF Format
    const columns: PdfColumn[] = [
      { header: 'Month', key: 'Month', width: 18 },
      { header: 'Created', key: 'Campaigns Created', width: 16 },
      { header: 'Completed', key: 'Campaigns Completed', width: 16 },
      { header: 'Recipients', key: 'Recipients Volume', width: 18 },
      { header: 'Confirmed Sends', key: 'Confirmed Sends', width: 18 },
      { header: 'Skipped', key: 'Skipped', width: 14 },
    ];

    const summaryBoxes: PdfSummaryBox[] = [
      { label: 'Total Months', value: rows.length },
      {
        label: 'Total Campaigns',
        value: rows.reduce((s, r) => s + (r['Campaigns Created'] as number), 0),
      },
      {
        label: 'Confirmed Sends',
        value: rows.reduce((s, r) => s + (r['Confirmed Sends'] as number), 0),
      },
    ];

    const buffer = pdfGeneratorService.generateReport({
      title: 'Monthly Outreach & Placement Activity Report',
      subtitle: 'Placement Candidate Management System • Confidential',
      generatedBy: filters.generatedBy || 'Administrator',
      summaryBoxes,
      columns,
      rows: rows as any,
      disclaimer,
    });

    return {
      buffer,
      fileName: `${fileName}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  /**
   * 5. Failed and Skipped Recipients Report
   */
  async generateFailedSkippedReport(
    format: ReportFormat,
    filters: ReportFilterOptions = {}
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const recipients = await CampaignRecipient.find({
      status: { $in: ['FAILED_TO_OPEN', 'SKIPPED'] },
    })
      .populate('campaignId', 'name companyId')
      .populate('candidateId', 'candidateId fullName')
      .populate('lastActionBy', 'name')
      .sort({ updatedAt: -1 })
      .limit(1000);

    const companyCache = new Map<string, string>();

    const rows = await Promise.all(
      recipients.map(async (r) => {
        const campaign = r.campaignId as any;
        const candidate = r.candidateId as any;
        const actor = r.lastActionBy as any;

        let compName = 'Unknown Company';
        if (campaign && campaign.companyId) {
          const compIdStr = campaign.companyId.toString();
          if (companyCache.has(compIdStr)) {
            compName = companyCache.get(compIdStr)!;
          } else {
            const comp = await Company.findById(campaign.companyId).select('companyName');
            if (comp) {
              compName = comp.companyName;
              companyCache.set(compIdStr, compName);
            }
          }
        }

        const phone = filters.unmaskPhone
          ? r.phoneNumber
          : maskPhoneNumber(r.phoneNumber);

        return {
          'Candidate Name': r.candidateName || candidate?.fullName || '-',
          'Candidate ID': candidate?.candidateId || '-',
          'Company': compName,
          'Campaign Name': campaign?.name || '-',
          'Phone': phone,
          'Status': r.status,
          'Reason / Error': r.errorDetails || r.skipReason || 'Skipped by admin action',
          'Attempt Count': (r.attemptHistory && r.attemptHistory.length) || 1,
          'Last Attempt Date': r.lastAttemptAt || r.skippedAt || r.updatedAt
            ? new Date(r.lastAttemptAt || r.skippedAt || r.updatedAt).toISOString().split('T')[0]
            : '-',
          'Performed By': actor?.name || r.lastActionByName || 'Administrator',
        };
      })
    );

    const fileName = `Failed_Skipped_Recipients_Report_${Date.now()}`;
    const disclaimer =
      'Notice: Records candidates whose messaging was skipped or failed to open. Phone numbers masked by default.';

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Failed and Skipped');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        buffer,
        fileName: `${fileName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
      return {
        buffer: Buffer.from(csv, 'utf8'),
        fileName: `${fileName}.csv`,
        mimeType: 'text/csv; charset=utf-8',
      };
    }

    // PDF Format
    const columns: PdfColumn[] = [
      { header: 'Candidate Name', key: 'Candidate Name', width: 22 },
      { header: 'Company', key: 'Company', width: 20 },
      { header: 'Status', key: 'Status', width: 16 },
      { header: 'Reason / Error', key: 'Reason / Error', width: 24 },
      { header: 'Attempts', key: 'Attempt Count', width: 8 },
      { header: 'Date', key: 'Last Attempt Date', width: 10 },
    ];

    const failedCount = rows.filter((r) => r.Status === 'FAILED_TO_OPEN').length;
    const skippedCount = rows.filter((r) => r.Status === 'SKIPPED').length;

    const summaryBoxes: PdfSummaryBox[] = [
      { label: 'Total Incomplete', value: rows.length },
      { label: 'Failed to Open', value: failedCount },
      { label: 'Skipped by Admin', value: skippedCount },
    ];

    const buffer = pdfGeneratorService.generateReport({
      title: 'Failed and Skipped Messaging Audit Report',
      subtitle: 'Placement Candidate Management System • Confidential',
      generatedBy: filters.generatedBy || 'Administrator',
      summaryBoxes,
      columns,
      rows: rows as any,
      disclaimer,
    });

    return {
      buffer,
      fileName: `${fileName}.pdf`,
      mimeType: 'application/pdf',
    };
  }
}

export const reportService = new ReportService();
