import { Component, OnInit } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { interval, Subscription } from 'rxjs';
import {
  Chart,
  LineController,
  ChartConfiguration,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
} from 'chart.js';

// Registra los componentes necesarios
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip
);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'Clinicare';
  isLoggedIn = false;
  accessToken: string | null = null;

  patients: any[] = [];
  alerts: any[] = [];
  vitalSigns: any[] = [];
  selectedPatientId: number | null = null;

  chart: Chart | null = null;
  updateSubscription: Subscription | null = null;

  constructor(private msalService: MsalService, private http: HttpClient) {}

  ngOnInit(): void {
    const account = this.msalService.instance.getActiveAccount();
    this.isLoggedIn = !!account;

    if (this.isLoggedIn) {
      this.fetchAllData();
    }
  }


  login() {
    this.msalService
      .loginPopup({
        scopes: [
          'https://cnsem1b2c.onmicrosoft.com/ebe5cc75-054a-447f-8d86-eaf1dbade5d5/azure_aws',
        ],
      })
      .subscribe({
        next: (result) => {
          console.log('Login success:', result);
          this.accessToken = result.accessToken;
          console.log('Access Token:', this.accessToken);
          this.isLoggedIn = true;
          this.fetchAllData();
        },
        error: (error) => {
          console.error('Login error:', error);
          this.isLoggedIn = false;
        },
      });
  }

  fetchAllData() {
    if (!this.accessToken) {
      console.error('No se encontró el token de acceso');
      return;
    }

    this.fetchPatients();
    this.fetchAlerts();
    this.fetchVitalSigns();
  }

  fetchPatients() {
    const apiUrl = 'https://yzugk60fk4.execute-api.us-east-1.amazonaws.com/pacientes';

    const headers = new HttpHeaders({
      Authorization: this.accessToken || '',
      Accept: 'application/json',
    });

    this.http.get(apiUrl, { headers }).subscribe({
      next: (data: any) => {
        console.log('Pacientes obtenidos:', data);
        this.patients = data;
      },
      error: (error) => {
        console.error('Error al obtener pacientes:', error);
      },
    });
  }

  fetchAlerts() {
    if (!this.selectedPatientId) {
      console.warn('Selecciona un paciente para ver sus alertas');
      return;
    }

    const apiUrl = `https://yzugk60fk4.execute-api.us-east-1.amazonaws.com/alertas/${this.selectedPatientId}`;

    const headers = new HttpHeaders({
      Authorization: this.accessToken || '',
      Accept: 'application/json',
    });

    this.http.get(apiUrl, { headers }).subscribe({
      next: (data: any) => {
        console.log('Alertas obtenidas:', data);
        this.alerts = data;
      },
      error: (error) => {
        console.error('Error al obtener alertas:', error);
      },
    });
  }

  fetchVitalSigns() {
    if (!this.selectedPatientId) {
      console.warn('Selecciona un paciente para ver sus señales vitales');
      return;
    }

    const apiUrl = `https://yzugk60fk4.execute-api.us-east-1.amazonaws.com/senales-vitales/${this.selectedPatientId}/historico`;

    const headers = new HttpHeaders({
      Authorization: this.accessToken || '',
      Accept: 'application/json',
    });

    this.http.get(apiUrl, { headers }).subscribe({
      next: (data: any) => {
        console.log('Señales vitales obtenidas:', data);
        this.vitalSigns = data;
        this.initializeChart();
      },
      error: (error) => {
        console.error('Error al obtener señales vitales:', error);
      },
    });
  }

  initializeChart() {
    const labels = this.vitalSigns.map(sign => sign.timestamp);
    const data = this.vitalSigns.map(sign => sign.value);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ritmo Cardíaco',
            data: data,
            borderColor: 'blue',
            backgroundColor: 'rgba(0, 123, 255, 0.5)',
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
          },
          y: {
            beginAtZero: true,
          },
        },
      },
    };

    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = document.getElementById('vitalSignsChart') as HTMLCanvasElement;
    this.chart = new Chart(ctx, config);
  }

  startUpdatingVitalSigns() {
    this.updateSubscription = interval(30000).subscribe(() => {
      if (this.selectedPatientId) {
        const newVitalSign = {
          type: 'Ritmo Cardíaco',
          value: Math.floor(Math.random() * (120 - 60 + 1)) + 60,
          timestamp: new Date().toISOString(),
        };

        // Envía la nueva señal vital al backend
        this.sendVitalSignToBackend(newVitalSign);

        // Actualiza la gráfica localmente
        this.vitalSigns.push(newVitalSign);
        this.initializeChart();
      }
    });
  }


  sendVitalSignToBackend(vitalSign: any) {
    const apiUrl = 'https://yzugk60fk4.execute-api.us-east-1.amazonaws.com/senales-vitales';

    const headers = new HttpHeaders({
      Authorization: this.accessToken || '',
      'Content-Type': 'application/json',
    });

    this.http.post(apiUrl, vitalSign, { headers }).subscribe({
      next: (response) => {
        console.log('Señal vital enviada con éxito:', response);
      },
      error: (error) => {
        console.error('Error al enviar la señal vital:', error);
      },
    });
  }

  selectPatient(patientId: number) {
    this.selectedPatientId = patientId;
    this.fetchVitalSigns();
    this.fetchAlerts();
    this.startUpdatingVitalSigns();
  }

  logout() {
    this.msalService.logoutPopup().subscribe({
      next: () => {
        console.log('Logout success');
        this.isLoggedIn = false;
        this.patients = [];
        this.alerts = [];
        this.vitalSigns = [];
        this.accessToken = null;
        this.selectedPatientId = null;

        if (this.updateSubscription) {
          this.updateSubscription.unsubscribe();
        }

        if (this.chart) {
          this.chart.destroy();
        }
      },
      error: (error) => {
        console.error('Logout error:', error);
      },
    });
  }

  


  getPatientName(patientId: number): string {
    const patient = this.patients.find((p) => p.id === patientId);
    return patient ? patient.name : 'Desconocido';
  }

}
