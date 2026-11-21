import { Role, IRole } from '../models/Role.model';
import { IAdmin } from '../models/Admin.model';

export interface PermissionDefinition {
  key: string;
  name: string;
  category: string;
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Candidate Permissions
  { key: 'candidates.view', name: 'View Candidates', category: 'Candidates', description: 'Browse and view candidate profiles' },
  { key: 'candidates.create', name: 'Create Candidate', category: 'Candidates', description: 'Add new candidate records' },
  { key: 'candidates.update', name: 'Update Candidate', category: 'Candidates', description: 'Edit candidate details and placement status' },
  { key: 'candidates.delete', name: 'Delete Candidate', category: 'Candidates', description: 'Delete candidate records' },
  { key: 'candidates.import', name: 'Import Candidates', category: 'Candidates', description: 'Bulk upload candidates via spreadsheets' },
  { key: 'candidates.export', name: 'Export Candidates', category: 'Candidates', description: 'Export candidate directory to Excel/CSV' },

  // Company Permissions
  { key: 'companies.view', name: 'View Companies', category: 'Companies', description: 'Browse and view hiring company details' },
  { key: 'companies.create', name: 'Create Company', category: 'Companies', description: 'Add new hiring companies' },
  { key: 'companies.update', name: 'Update Company', category: 'Companies', description: 'Edit company profile and job criteria' },
  { key: 'companies.delete', name: 'Delete Company', category: 'Companies', description: 'Delete company records' },

  // Virtual Group Permissions
  { key: 'groups.view', name: 'View Virtual Groups', category: 'Virtual Groups', description: 'View company placement virtual groups' },
  { key: 'groups.create', name: 'Create Virtual Group', category: 'Virtual Groups', description: 'Create new virtual recruitment groups' },
  { key: 'groups.update', name: 'Update Virtual Group', category: 'Virtual Groups', description: 'Edit virtual group settings and status' },
  { key: 'groups.manage_members', name: 'Manage Members', category: 'Virtual Groups', description: 'Assign or remove candidates from groups' },

  // Contact Fetcher Permissions
  { key: 'contacts.fetch', name: 'Access Contact Fetcher', category: 'Contact Fetcher', description: 'Evaluate and filter eligible candidates' },
  { key: 'contacts.assign', name: 'Assign to Groups', category: 'Contact Fetcher', description: 'Bulk assign evaluated candidates' },
  { key: 'contacts.import', name: 'Spreadsheet Upload', category: 'Contact Fetcher', description: 'Upload raw contact sheets and manual paste' },

  // WhatsApp Messaging Permissions
  { key: 'whatsapp.view', name: 'View Campaigns', category: 'WhatsApp', description: 'View campaigns and messaging history' },
  { key: 'whatsapp.create_campaign', name: 'Create Campaigns', category: 'WhatsApp', description: 'Draft and prepare outreach campaigns' },
  { key: 'whatsapp.approve_campaign', name: 'Approve Campaigns', category: 'WhatsApp', description: 'Approve personalized recipient messages' },
  { key: 'whatsapp.send', name: 'Send Messages', category: 'WhatsApp', description: 'Execute assisted sending or Cloud API dispatch' },
  { key: 'whatsapp.manage_templates', name: 'Manage Templates', category: 'WhatsApp', description: 'Create and edit message templates' },
  { key: 'whatsapp.manage_connection', name: 'Gateway Connection', category: 'WhatsApp', description: 'Manage Cloud API credentials and webhooks' },

  // Reports Permissions
  { key: 'reports.view', name: 'View Reports', category: 'Reports', description: 'Access placement analytics and campaign statistics' },
  { key: 'reports.export', name: 'Export Reports', category: 'Reports', description: 'Download analytics in Excel, CSV, and PDF' },

  // Administration Permissions
  { key: 'admins.view', name: 'View Administrators', category: 'Administration', description: 'View admin user accounts' },
  { key: 'admins.create', name: 'Create Administrator', category: 'Administration', description: 'Provision new administrator accounts' },
  { key: 'admins.update', name: 'Update Administrator', category: 'Administration', description: 'Edit administrator profiles and reset passwords' },
  { key: 'admins.deactivate', name: 'Deactivate Admin', category: 'Administration', description: 'Activate or suspend admin accounts' },
  { key: 'roles.manage', name: 'Manage Roles & RBAC', category: 'Administration', description: 'Create roles and configure permission matrix' },
  { key: 'settings.view', name: 'View Settings', category: 'Administration', description: 'View system and security settings' },
  { key: 'settings.update', name: 'Update Settings', category: 'Administration', description: 'Modify global application configuration' },
  { key: 'audit_logs.view', name: 'View Audit Logs', category: 'Administration', description: 'Access immutable system audit trail' },
  { key: 'audit_logs.export', name: 'Export Audit Logs', category: 'Administration', description: 'Export audit logs to CSV' },
  { key: 'sessions.view', name: 'View Sessions', category: 'Administration', description: 'Monitor active logins and devices' },
  { key: 'sessions.revoke', name: 'Revoke Sessions', category: 'Administration', description: 'Terminate active administrator sessions' },
];

export class PermissionService {
  /**
   * Seeds default system roles if they do not already exist
   */
  async seedDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        roleId: 'ROLE_SUPER_ADMIN',
        name: 'Super Admin',
        slug: 'superadmin',
        description: 'Unrestricted full access across all modules, administrators, settings, and security controls.',
        isSystemRole: true,
        permissions: ['*'], // wildcard matches all
      },
      {
        roleId: 'ROLE_PLACEMENT_ADMIN',
        name: 'Placement Admin',
        slug: 'placement_admin',
        description: 'Manages candidates, companies, groups, campaigns, templates, and reports. Cannot modify Super Admins or global security.',
        isSystemRole: true,
        permissions: [
          'candidates.view',
          'candidates.create',
          'candidates.update',
          'candidates.delete',
          'candidates.import',
          'candidates.export',
          'companies.view',
          'companies.create',
          'companies.update',
          'companies.delete',
          'groups.view',
          'groups.create',
          'groups.update',
          'groups.manage_members',
          'contacts.fetch',
          'contacts.assign',
          'contacts.import',
          'whatsapp.view',
          'whatsapp.create_campaign',
          'whatsapp.approve_campaign',
          'whatsapp.send',
          'whatsapp.manage_templates',
          'reports.view',
          'reports.export',
          'audit_logs.view',
          'sessions.view',
        ],
      },
      {
        roleId: 'ROLE_PLACEMENT_EXECUTIVE',
        name: 'Placement Executive',
        slug: 'placement_executive',
        description: 'Coordinates placement drives. Can manage permitted candidates, prepare campaigns, and view reports.',
        isSystemRole: true,
        permissions: [
          'candidates.view',
          'candidates.create',
          'candidates.update',
          'companies.view',
          'groups.view',
          'groups.manage_members',
          'contacts.fetch',
          'contacts.assign',
          'whatsapp.view',
          'whatsapp.create_campaign',
          'whatsapp.send',
          'reports.view',
        ],
      },
      {
        roleId: 'ROLE_VIEWER',
        name: 'Viewer',
        slug: 'viewer',
        description: 'Read-only access to candidates, companies, virtual groups, campaigns, and reports.',
        isSystemRole: true,
        permissions: [
          'candidates.view',
          'companies.view',
          'groups.view',
          'whatsapp.view',
          'reports.view',
        ],
      },
    ];

    for (const r of defaultRoles) {
      await Role.findOneAndUpdate(
        { slug: r.slug },
        { $setOnInsert: r },
        { upsert: true, new: true }
      );
    }
  }

  /**
   * Resolves the effective permission set for an administrator
   */
  async getEffectivePermissions(admin: IAdmin): Promise<string[]> {
    if (!admin) return [];

    // Super Admin has all permissions
    if (admin.role === 'superadmin' || admin.role === 'Super Admin') {
      return ALL_PERMISSIONS.map((p) => p.key);
    }

    let rolePermissions: string[] = [];

    // Find assigned role
    let role: IRole | null = null;
    if (admin.roleId) {
      role = await Role.findById(admin.roleId);
    }
    if (!role && admin.role) {
      role = await Role.findOne({
        $or: [{ slug: admin.role.toLowerCase() }, { name: admin.role }],
      });
    }

    if (role) {
      if (role.permissions.includes('*')) {
        return ALL_PERMISSIONS.map((p) => p.key);
      }
      rolePermissions = role.permissions || [];
    }

    // Merge custom overrides
    const custom = admin.customPermissions || [];
    const merged = Array.from(new Set([...rolePermissions, ...custom]));
    return merged;
  }

  /**
   * Checks if an administrator has a specific permission
   */
  async hasPermission(admin: IAdmin, requiredPermission: string): Promise<boolean> {
    if (!admin || !admin.isActive) return false;
    if (admin.role === 'superadmin' || admin.role === 'Super Admin') return true;

    const permissions = await this.getEffectivePermissions(admin);
    return permissions.includes(requiredPermission) || permissions.includes('*');
  }
}

export const permissionService = new PermissionService();
