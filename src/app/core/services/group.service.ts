import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GroupMember {
  user: any;
  role: string;
  joinedAt: Date;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  members: GroupMember[];
  type: string;
  isActive: boolean;
  participants: string[];
  admins: string[];
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/groups`;

  getMyGroups(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}`);
  }

  getGroupById(groupId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${groupId}`);
  }

  createGroup(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  joinGroup(groupId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${groupId}/join`, {}); 
  }

  searchGroups(query: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/search?q=${query}`);
  }

  updateGroup(groupId: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${groupId}`, data);
  }

  deleteGroup(groupId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${groupId}`);
  }

  leaveGroup(groupId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${groupId}/leave`);
  }

  getGroupMessages(groupId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${groupId}/messages`);
  }

  sendGroupMessage(groupId: string, text: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${groupId}/messages`, { content: text });
  }
}
