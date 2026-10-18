import type { ObjectId } from "mongodb";

export interface User {
  _id: ObjectId;
  email: string;
  name: string;
  /** bcrypt hash — never sent to the client. */
  passwordHash: string;
  role: "admin" | "staff";
  departments?: import("@/types/order").ProductStatus[];
  active?: boolean;
  updatedAt?: Date;
  createdAt: Date;
}
