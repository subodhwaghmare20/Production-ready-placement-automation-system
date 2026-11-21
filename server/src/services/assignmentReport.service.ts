import { IFetchOperationHistory } from '../models/FetchOperationHistory.model';

/**
 * Formats a CSV report string from a FetchOperationHistory document
 */
export function generateOperationCsvReport(operation: IFetchOperationHistory): string {
  const lines: string[] = [];

  // Metadata block
  lines.push(`"Placement Automation System - Contact Fetcher & Assignment Report"`);
  lines.push(`"Operation ID","${operation.operationId}"`);
  lines.push(`"Date & Time","${new Date(operation.createdAt).toISOString()}"`);
  lines.push(`"Admin Name","${operation.adminName || 'Admin'}"`);
  lines.push(`"Source Type","${operation.sourceType}"`);
  lines.push(`"Company","${operation.companyName || 'N/A'}"`);
  lines.push(`"Virtual Group","${operation.groupName || 'N/A'}"`);
  lines.push(``);

  // Summary Metrics block
  lines.push(`"SUMMARY METRICS"`);
  lines.push(`"Metric","Count"`);
  lines.push(`"Total Processed",${operation.totalProcessed}`);
  lines.push(`"Valid Records",${operation.validRecords}`);
  lines.push(`"Invalid Records",${operation.invalidRecords}`);
  lines.push(`"Duplicate Records",${operation.duplicateRecords}`);
  lines.push(`"Existing Candidates Matched",${operation.existingCandidates}`);
  lines.push(`"Unknown Phone Numbers",${operation.unknownNumbers}`);
  lines.push(`"Successfully Assigned",${operation.successfulAssignments}`);
  lines.push(`"Already in Group (Skipped)",${operation.alreadyAssigned}`);
  lines.push(`"Candidates Without WhatsApp Consent",${operation.withoutConsent}`);
  lines.push(`"Failed / Blocked Assignments",${operation.failedAssignments}`);
  lines.push(``);

  // Section 1: Successfully Assigned Candidates
  lines.push(`"SUCCESSFULLY ASSIGNED CANDIDATES"`);
  lines.push(`"Candidate ID","Full Name","Phone Number","WhatsApp Consent"`);
  if (operation.reportData?.assigned && operation.reportData.assigned.length > 0) {
    for (const item of operation.reportData.assigned) {
      lines.push(
        `"${item.candidateId}","${item.fullName}","${item.phone}","${
          item.consent ? 'Consented' : 'No Consent'
        }"`
      );
    }
  } else {
    lines.push(`"No candidates assigned in this operation"`);
  }
  lines.push(``);

  // Section 2: Skipped / Ineligible Candidates
  lines.push(`"SKIPPED OR BLOCKED CANDIDATES"`);
  lines.push(`"Candidate ID","Full Name","Phone Number","Reason for Skipping"`);
  if (operation.reportData?.skipped && operation.reportData.skipped.length > 0) {
    for (const item of operation.reportData.skipped) {
      lines.push(
        `"${item.candidateId}","${item.fullName}","${item.phone}","${item.reason.replace(
          /"/g,
          '""'
        )}"`
      );
    }
  } else {
    lines.push(`"No records skipped"`);
  }
  lines.push(``);

  // Section 3: Rejected / Invalid Records
  lines.push(`"REJECTED OR INVALID RECORDS"`);
  lines.push(`"Identifier","Name","Phone Number","Failure Reason"`);
  if (operation.reportData?.rejected && operation.reportData.rejected.length > 0) {
    for (const item of operation.reportData.rejected) {
      lines.push(
        `"${item.identifier}","${item.name || ''}","${item.phone || ''}","${item.reason.replace(
          /"/g,
          '""'
        )}"`
      );
    }
  } else {
    lines.push(`"No invalid records rejected"`);
  }

  return lines.join('\n');
}

