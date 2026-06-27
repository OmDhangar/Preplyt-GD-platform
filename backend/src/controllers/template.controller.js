const EvaluationTemplate = require('../models/EvaluationTemplate');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const { success, created, paginated } = require('../utils/apiResponse');
const auditService       = require('../services/audit.service');
const { TEMPLATE_STATUS, AUDIT_ACTIONS } = require('../config/constants');

// ── POST /api/templates ────────────────────────────────────────────────────────
exports.createTemplate = asyncHandler(async (req, res) => {
  const template = await EvaluationTemplate.create({
    ...req.body,
    createdBy: req.user._id,
  });

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.TEMPLATE_CREATE,
    resource: 'EvaluationTemplate',
    resourceId: template._id,
  });

  created(res, { template }, 'Template created');
});

// ── GET /api/templates ─────────────────────────────────────────────────────────
exports.getTemplates = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  // Instructors see their own + default templates; admins see all
  const filter = { isArchived: false };
  if (req.user.role !== 'admin') {
    filter.$or = [{ createdBy: req.user._id }, { isDefault: true }];
  }
  if (status) filter.status = status;

  const skip  = (page - 1) * limit;
  const total = await EvaluationTemplate.countDocuments(filter);
  const templates = await EvaluationTemplate
    .find(filter)
    .populate('createdBy', 'name email')
    .select('-fields') // omit fields list for index view — fetch on demand
    .sort({ isDefault: -1, updatedAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  paginated(res, templates, page, limit, total);
});

// ── GET /api/templates/:id ────────────────────────────────────────────────────
exports.getTemplate = asyncHandler(async (req, res, next) => {
  const template = await EvaluationTemplate
    .findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!template || template.isArchived) {
    return next(new AppError('Template not found.', 404));
  }
  success(res, { template });
});

// ── PATCH /api/templates/:id ──────────────────────────────────────────────────
exports.updateTemplate = asyncHandler(async (req, res, next) => {
  const template = await EvaluationTemplate.findById(req.params.id);
  if (!template || template.isArchived) {
    return next(new AppError('Template not found.', 404));
  }

  // Only creator or admin can edit
  if (String(template.createdBy) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to edit this template.', 403));
  }

  if (template.status === TEMPLATE_STATUS.ACTIVE) {
    // Active templates: create new version instead of mutating
    const newVersion = new EvaluationTemplate({
      ...template.toObject(),
      _id:              undefined,
      version:          template.version + 1,
      status:           TEMPLATE_STATUS.DRAFT,
      parentTemplateId: template._id,
      createdAt:        undefined,
      updatedAt:        undefined,
      ...req.body,
      createdBy:        req.user._id,
    });
    await newVersion.save();
    return created(res, { template: newVersion }, 'New template version created (original is active)');
  }

  // For draft templates, allow partial updates but preserve required fields
  const { name, description, fields, tags } = req.body;
  if (name !== undefined) template.name = name;
  if (description !== undefined) template.description = description;
  if (fields !== undefined) template.fields = fields;
  if (tags !== undefined) template.tags = tags;
  await template.save();

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.TEMPLATE_UPDATE,
    resource: 'EvaluationTemplate',
    resourceId: template._id,
  });

  success(res, { template }, 'Template updated');
});

// ── PATCH /api/templates/:id/publish ─────────────────────────────────────────
exports.publishTemplate = asyncHandler(async (req, res, next) => {
  const template = await EvaluationTemplate.findById(req.params.id);
  if (!template) return next(new AppError('Template not found.', 404));

  if (String(template.createdBy) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to publish this template.', 403));
  }
  if (template.status === TEMPLATE_STATUS.ACTIVE) {
    return next(new AppError('Template is already active.', 400));
  }

  template.status = TEMPLATE_STATUS.ACTIVE;
  await template.save();

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.TEMPLATE_PUBLISH,
    resource: 'EvaluationTemplate',
    resourceId: template._id,
  });

  success(res, { template }, 'Template published');
});

// ── PATCH /api/templates/:id/archive ─────────────────────────────────────────
exports.archiveTemplate = asyncHandler(async (req, res, next) => {
  const template = await EvaluationTemplate.findById(req.params.id);
  if (!template) return next(new AppError('Template not found.', 404));

  if (String(template.createdBy) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to archive this template.', 403));
  }

  template.status     = TEMPLATE_STATUS.ARCHIVED;
  template.isArchived = true;
  await template.save();

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.TEMPLATE_ARCHIVE,
    resource: 'EvaluationTemplate',
    resourceId: template._id,
  });

  success(res, null, 'Template archived');
});

// ── POST /api/templates/:id/duplicate ────────────────────────────────────────
exports.duplicateTemplate = asyncHandler(async (req, res, next) => {
  const src = await EvaluationTemplate.findById(req.params.id);
  if (!src) return next(new AppError('Template not found.', 404));

  const copy = new EvaluationTemplate({
    ...src.toObject(),
    _id:              undefined,
    name:             req.body.name || `${src.name} (copy)`,
    status:           TEMPLATE_STATUS.DRAFT,
    isDefault:        false,
    version:          1,
    parentTemplateId: src._id,
    createdBy:        req.user._id,
    createdAt:        undefined,
    updatedAt:        undefined,
  });
  await copy.save();

  created(res, { template: copy }, 'Template duplicated');
});

// ── DELETE /api/templates/:id ────────────────────────────────────────────────
exports.deleteTemplate = asyncHandler(async (req, res, next) => {
  const template = await EvaluationTemplate.findById(req.params.id);
  if (!template) return next(new AppError('Template not found.', 404));

  // Only creator or admin can delete
  if (String(template.createdBy) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to delete this template.', 403));
  }

  // Check if default template
  if (template.isDefault && req.user.role !== 'admin') {
    return next(new AppError('Default templates can only be deleted by an admin.', 403));
  }

  // Check if used by any GD session
  const GdSession = require('../models/GdSession');
  const sessionCount = await GdSession.countDocuments({ templateId: template._id });
  if (sessionCount > 0) {
    return next(new AppError('Cannot delete template as it is currently in use by one or more GD sessions. You can archive it instead.', 400));
  }

  // Check if used by any evaluation record
  const EvaluationRecord = require('../models/EvaluationRecord');
  const recordCount = await EvaluationRecord.countDocuments({ templateId: template._id });
  if (recordCount > 0) {
    return next(new AppError('Cannot delete template as it is referenced by existing evaluation records. You can archive it instead.', 400));
  }

  await EvaluationTemplate.findByIdAndDelete(template._id);

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.TEMPLATE_DELETE,
    resource: 'EvaluationTemplate',
    resourceId: template._id,
  });

  success(res, null, 'Template deleted successfully');
});
