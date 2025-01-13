import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = 'https://yzugk60fk4.execute-api.us-east-1.amazonaws.com/pacientes'; // URL del API Gateway

  constructor(private http: HttpClient) {}

  getAllPatients(token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}` // Incluye el token en el header
    });
    return this.http.get(this.apiUrl, { headers });
  }

  getPatientById(id: string, token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}` // Incluye el token en el header
    });
    const url = `${this.apiUrl}/${id}`; // Construye la URL con el ID
    return this.http.get(url, { headers });
  }
}
