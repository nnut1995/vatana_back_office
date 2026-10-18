import { productStatus, type OrderProduct, type ProductStatus } from '@/types/order';
export type AccessUser = { id: string; name: string; email: string; role: 'admin' | 'staff'; departments: ProductStatus[]; active: boolean };
export function canAccessDepartment(user: AccessUser, stage: ProductStatus) {
  return user.active && (user.role === 'admin' || user.departments.includes(stage));
}
export function canWorkProduct(user: AccessUser, product: OrderProduct) {
  return canAccessDepartment(user, productStatus(product));
}
