const { z } = require('zod');

const login = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshToken = z.object({ refreshToken: z.string().min(10) });

const createUser = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  name: z.string().min(2),
  roleUid: z.string().uuid(),
  contactNumber: z.string().optional(),
});

const categoryCreate = z.object({ name: z.string().min(2).max(100), sortOrder: z.number().int().optional() });
const categoryUpdate = z.object({
  name: z.string().min(2).max(100).optional(),
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

const serviceSectorCreate = z.object({ sectorName: z.string().min(2).max(150), areaCode: z.string().min(1).max(20) });
const serviceSectorUpdate = z.object({
  sectorName: z.string().min(2).max(150).optional(),
  areaCode: z.string().min(1).max(20).optional(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
});

const chatName = z.object({ name: z.string().min(1).max(120) });
const chatMobile = z.object({ mobileNumber: z.string().min(6).max(20) });
const chatOtp = z.object({ code: z.string().min(4).max(8) });
const chatCategory = z.object({ categoryId: z.number().int() });
const chatSubcategory = z.object({ subcategoryId: z.number().int() });
const chatLocation = z.object({
  serviceSectorId: z.number().int().nullable().optional(),
  locationText: z.string().max(150).nullable().optional(),
});

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
  login, refreshToken, createUser,
  categoryCreate, categoryUpdate,
  subcategoryCreate, subcategoryUpdate,
  serviceSectorCreate, serviceSectorUpdate,
  chatName, chatMobile, chatOtp, chatCategory, chatSubcategory, chatLocation,
  licenseCreate, roleCreate, roleUpdate, setUserRole,
};
