import { excelService } from './excelService';

class BackupService {
  /**
   * Generates an Excel backup containing HR Tasks and Notes,
   * with filename formatted as HR_Tasks_Backup_YYYY-MM-DD.xlsx,
   * triggers the download, and returns a promise for smooth chaining.
   */
  public generateExitBackup(): string {
    const today = new Date().toISOString().split('T')[0];
    const filename = `HR_Tasks_Backup_${today}.xlsx`;
    excelService.exportToExcel(filename);
    return filename;
  }
}

export const backupService = new BackupService();
