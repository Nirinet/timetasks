import { UserRole } from '@prisma/client';

/**
 * Shared Prisma query patterns used across multiple routes.
 * Centralizing these patterns reduces duplication and ensures consistency.
 */

// Basic user name selection (used in 10+ places)
export const USER_SELECT_BASIC = {
  firstName: true,
  lastName: true
} as const;

// User with role (used in task assignments, comments)
export const USER_SELECT_WITH_ROLE = {
  firstName: true,
  lastName: true,
  role: true
} as const;

// Client basic selection
export const CLIENT_SELECT_BASIC = {
  name: true
} as const;

// Client with contact info
export const CLIENT_SELECT_DETAIL = {
  id: true,
  name: true,
  contactPerson: true
} as const;

// Project clients include (many-to-many via ProjectClient)
export const PROJECT_CLIENTS_INCLUDE = {
  clients: {
    include: {
      client: {
        select: CLIENT_SELECT_DETAIL
      }
    }
  }
} as const;

// Project clients include (basic — just names)
export const PROJECT_CLIENTS_INCLUDE_BASIC = {
  clients: {
    include: {
      client: {
        select: CLIENT_SELECT_BASIC
      }
    }
  }
} as const;

// Task include for list views (tasks list, project tasks)
export const TASK_INCLUDE_LIST = {
  project: {
    select: {
      name: true,
      ...PROJECT_CLIENTS_INCLUDE_BASIC
    }
  },
  assignedUsers: {
    include: {
      user: {
        select: USER_SELECT_WITH_ROLE
      },
      client: {
        select: CLIENT_SELECT_BASIC
      }
    }
  },
  _count: {
    select: {
      subtasks: true,
      comments: true,
      timeRecords: true
    }
  }
} as const;

// Task include for create/update responses (lighter than list)
export const TASK_INCLUDE_MUTATION = {
  project: {
    select: {
      name: true,
      ...PROJECT_CLIENTS_INCLUDE_BASIC
    }
  },
  assignedUsers: {
    include: {
      user: {
        select: USER_SELECT_BASIC
      },
      client: {
        select: CLIENT_SELECT_BASIC
      }
    }
  }
} as const;

// Time record include for task select (used in time routes)
export const TIME_RECORD_TASK_SELECT = {
  title: true,
  project: {
    select: {
      name: true,
      ...PROJECT_CLIENTS_INCLUDE_BASIC
    }
  }
} as const;

// Time record include for task select with project ID (used in start/stop timer)
export const TIME_RECORD_TASK_SELECT_WITH_PROJECT_ID = {
  id: true,
  title: true,
  project: {
    select: {
      id: true,
      name: true
    }
  }
} as const;

// Project include for list views
export const PROJECT_INCLUDE_LIST = {
  ...PROJECT_CLIENTS_INCLUDE,
  createdBy: {
    select: USER_SELECT_BASIC
  },
  assignedUsers: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, role: true }
      }
    }
  },
  _count: {
    select: {
      tasks: true
    }
  }
} as const;

// Project include for create/update responses
export const PROJECT_INCLUDE_MUTATION = {
  ...PROJECT_CLIENTS_INCLUDE,
  createdBy: {
    select: USER_SELECT_BASIC
  }
} as const;

// Comment include
export const COMMENT_INCLUDE = {
  author: {
    select: USER_SELECT_WITH_ROLE
  }
} as const;

// Comment include with files
export const COMMENT_INCLUDE_WITH_FILES = {
  author: {
    select: USER_SELECT_WITH_ROLE
  },
  files: {
    include: {
      uploadedBy: {
        select: USER_SELECT_BASIC
      }
    }
  }
} as const;

/**
 * Apply CLIENT role filter to a task where clause.
 * Client users can only see tasks belonging to projects linked to their Client entity.
 */
export function applyClientTaskFilter(whereClause: any, clientEntityId: string | null, role: UserRole): any {
  if (role === 'CLIENT') {
    whereClause.project = {
      ...whereClause.project,
      clients: {
        some: {
          clientId: clientEntityId ?? '__no_access__'
        }
      }
    };
  }
  return whereClause;
}

/**
 * Apply CLIENT role filter for project access.
 * Clients can only see projects linked to their Client entity.
 */
export function applyClientProjectFilter(whereClause: any, clientEntityId: string | null, role: UserRole): any {
  if (role === 'CLIENT') {
    whereClause.clients = {
      some: {
        clientId: clientEntityId ?? '__no_access__'
      }
    };
  }
  return whereClause;
}

/**
 * Parse pagination parameters from query string.
 * Returns safe, bounded values.
 */
export function parsePagination(query: any, defaultLimit = 20): {
  take: number;
  skip: number;
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || defaultLimit));
  return { take: limit, skip: (page - 1) * limit, page, limit };
}

/**
 * Build pagination response metadata.
 */
export function paginationResponse(page: number, limit: number, totalCount: number) {
  return {
    page,
    limit,
    totalCount,
    totalPages: Math.ceil(totalCount / limit)
  };
}
