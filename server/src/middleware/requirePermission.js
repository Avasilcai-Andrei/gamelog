export const requirePermission = (permissionName) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })
  if (!req.user.permissions?.includes(permissionName)) {
    return res.status(403).json({ error: 'Forbidden — missing permission: ' + permissionName })
  }
  return next()
}
