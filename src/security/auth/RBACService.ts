/**
 * Role-Based Access Control (RBAC) Service
 */

import { UserRole, Permission, DEFAULT_PERMISSIONS } from './types';

export class RBACService {
  private permissions: Map<UserRole, Permission[]>;

  constructor() {
    this.permissions = new Map();
    // Initialize with default permissions
    Object.entries(DEFAULT_PERMISSIONS).forEach(([role, perms]) => {
      this.permissions.set(role as UserRole, perms);
    });
  }

  /**
   * Check if role has permission to perform action on resource
   */
  hasPermission(role: UserRole, resource: string, action: string): boolean {
    const rolePermissions = this.permissions.get(role);
    if (!rolePermissions) {
      return false;
    }

    // Check for wildcard permission (ADMIN has * resource with * actions)
    const wildcardPerm = rolePermissions.find(p => p.resource === '*');
    if (wildcardPerm && wildcardPerm.actions.includes('*')) {
      return true;
    }

    // Check specific resource permissions
    const resourcePerm = rolePermissions.find(p => p.resource === resource);
    if (!resourcePerm) {
      return false;
    }

    // Check if action is allowed
    return resourcePerm.actions.includes('*') || resourcePerm.actions.includes(action);
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: UserRole): Permission[] {
    return this.permissions.get(role) || [];
  }

  /**
   * Add permission to role
   */
  addPermission(role: UserRole, resource: string, actions: string[]): void {
    const rolePermissions = this.permissions.get(role) || [];
    const existingPerm = rolePermissions.find(p => p.resource === resource);

    if (existingPerm) {
      // Merge actions
      existingPerm.actions = [...new Set([...existingPerm.actions, ...actions])];
    } else {
      rolePermissions.push({ resource, actions });
    }

    this.permissions.set(role, rolePermissions);
  }

  /**
   * Remove permission from role
   */
  removePermission(role: UserRole, resource: string, actions?: string[]): void {
    const rolePermissions = this.permissions.get(role);
    if (!rolePermissions) return;

    if (!actions) {
      // Remove entire resource permission
      this.permissions.set(
        role,
        rolePermissions.filter(p => p.resource !== resource)
      );
    } else {
      // Remove specific actions
      const resourcePerm = rolePermissions.find(p => p.resource === resource);
      if (resourcePerm) {
        resourcePerm.actions = resourcePerm.actions.filter(a => !actions.includes(a));
      }
    }
  }

  /**
   * Check if one role is more privileged than another
   */
  isMorePrivileged(role1: UserRole, role2: UserRole): boolean {
    const hierarchy = {
      [UserRole.ADMIN]: 4,
      [UserRole.OPERATOR]: 3,
      [UserRole.BOT]: 2,
      [UserRole.VIEWER]: 1
    };

    return hierarchy[role1] > hierarchy[role2];
  }
}
