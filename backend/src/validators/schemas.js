const { z } = require('zod');

const login = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshToken = z.object({ refreshToken: z.string().min(10) });

const reauthenticate = z.object({
  password: z.string().min(1),
  purpose: z.string().min(1),
});

const createUser = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  name: z.string().min(2),
  roleUid: z.string().uuid(),
  contactNumber: z.string().optional(),
});

const categoryCreate = z.object({
  name: z.string().min(2).max(100),
  parentId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
});
const categoryUpdate = z.object({
  name: z.string().min(2).max(100).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
  sortOrder: z.number().int().optional(),
});

const subcategoryCreate = z.object({
  categoryId: z.number().int(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().optional(),
});
const subcategoryUpdate = z.object({
  categoryId: z.number().int().optional(),
  name: z.string().min(1).max(100).optional(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
  sortOrder: z.number().int().optional(),
});

const serviceSectorCreate = z.object({ sectorName: z.string().min(2).max(150), slug: z.string().min(1).max(250) });
const serviceSectorUpdate = z.object({
  sectorName: z.string().min(2).max(150).optional(),
  slug: z.string().min(1).max(250).optional(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
});

const chatName = z.object({ name: z.string().min(1).max(120) });
const chatMobile = z.object({ mobileNumber: z.string().min(10).max(20) });
// Exact length + digits-only is enforced in otpService.verifyOtp (it owns
// OTP_LENGTH) so a bad code gets a friendly message instead of a 422.
const chatOtp = z.object({ code: z.string().min(1).max(10) });
const chatCategory = z.object({
  categoryId: z.number().int().positive().optional(),
  categoryIds: z.array(z.number().int().positive()).min(1).max(20).optional(),
}).refine((body) => body.categoryId !== undefined || body.categoryIds !== undefined);
const chatSubcategory = z.object({
  subcategoryId: z.number().int().positive().optional(),
  subcategoryIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
}).refine((body) => body.subcategoryId !== undefined || body.subcategoryIds !== undefined);
const chatConfiguration = z.object({
  configurationIds: z.array(z.string().min(1).max(220)).min(1).max(100),
});
const chatLocation = z.object({
  serviceSectorId: z.number().int().positive().nullable().optional(),
  serviceSectorIds: z.array(z.number().int().positive()).max(100).optional(),
  locationText: z.string().trim().max(150).nullable().optional(),
}).refine((body) => (
  (body.serviceSectorIds?.length || 0) > 0
  || body.serviceSectorId != null
  || Boolean(body.locationText)
));

const licenseCreate = z.object({
  licenseId: z.string().min(3).max(100),
  clientName: z.string().min(2).max(255),
  companyAddress: z.string().max(500).optional(),
  companyContact: z.string().max(50).optional(),
  companyEmail: z.string().email(),
  productName: z.string().min(2).max(100),
  deploymentType: z.enum(['cloud', 'on_premise', 'hybrid']).optional(),
  maxUsers: z.number().int().min(1).optional(),
  maxAdminUsers: z.number().int().min(1).optional(),
  maxTokenUsageCharge: z.number().optional(),
  licenseType: z.enum(['trial', 'standard', 'enterprise']).optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  remarks: z.string().max(2000).optional(),
  validFrom: z.string().min(4),
  validTill: z.string().min(4),
});

const ROLE_LEVELS = ['super_admin', 'admin', 'manager', 'viewer', 'other'];

const roleCreate = z.object({
  roleName: z.string().min(2).max(100),
  roleLevel: z.enum(ROLE_LEVELS),
  canViewAllChats: z.boolean().optional(),
  canDownload: z.boolean().optional(),
  canManageUsers: z.boolean().optional(),
  canAccessDashboard: z.boolean().optional(),
  canAccessTrainAi: z.boolean().optional(),
  canAccessTokenUsage: z.boolean().optional(),
  canAccessScheduler: z.boolean().optional(),
  canAccessLicenseManagement: z.boolean().optional(),
  canViewAllAdminChats: z.boolean().optional(),
  canManageCategories: z.boolean().optional(),
  canManageRoles: z.boolean().optional(),
});

const roleUpdate = roleCreate.partial();

const setUserRole = z.object({ roleUid: z.string().uuid() });

module.exports = {
  login, refreshToken, reauthenticate, createUser,
  categoryCreate, categoryUpdate,
  subcategoryCreate, subcategoryUpdate,
  serviceSectorCreate, serviceSectorUpdate,
  chatName, chatMobile, chatOtp, chatCategory, chatSubcategory, chatConfiguration, chatLocation,
  licenseCreate, roleCreate, roleUpdate, setUserRole,
};
