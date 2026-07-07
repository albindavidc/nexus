export interface ISocketResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
}

export interface IUser {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  status?: string;
  lastSeen?: string;
}

export interface IMediaMeta {
  mimeType: string;
  size: number;
  filename: string;
}

export interface IMessage {
  _id: string;
  conversation?: string | IConversation;
  groupRef?: string | IConversation;
  type: string;
  sender: IUser;
  content: string;
  mediaURL?: string;
  mediaUrl?: string;
  mediaMeta?: IMediaMeta;
  replyTo?: IMessage | string;
  readBy?: { user: string; readAt: string }[];
  deliveredTo?: { user: string; deliveredAt: string }[];
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISender {
  _id: string;
  name: string;
  avatar?: string;
}

export interface IAPIResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface IConversation {
  _id: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  description?: string;
  avatar?: string;
  theme?: string;
  members?: IGroupMember[];
  participants: IUser[];
  creator?: string;
  lastMessage?: IMessage | string;
  isActive: boolean;
  pins?: string[];
  isFavorite?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  membersCount?: number;
}

export interface IGroupMember {
  user: IUser;
  role: 'ADMIN' | 'MEMBER' | 'OWNER';
  joinedAt: string;
  addedBy?: string;
}

export type IGroup = IConversation;
