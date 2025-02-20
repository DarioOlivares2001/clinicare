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
  alertsUpdateSubscription: Subscription | null = null;  // Nueva propiedad

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
    // Cambiamos el intervalo de 30000 (30 segundos) a 5000 (5 segundos)
    this.updateSubscription = interval(5000).subscribe(() => {
      if (this.selectedPatientId) {
        const currentTimestamp = new Date().toISOString();
        
        // Aumentamos la probabilidad de valores críticos a 50%
        const randomFactor = Math.random();
        
        let heartRate;
        if (randomFactor < 0.5) { // 50% de probabilidad de valores críticos
          // Generamos valores más altos, entre 150 y 180
          heartRate = Math.floor(Math.random() * (180 - 150 + 1)) + 150;
        } else {
          // Valores normales entre 60 y 100
          heartRate = Math.floor(Math.random() * (100 - 60 + 1)) + 60;
        }

        const newVitalSign = {
          patientId: this.selectedPatientId,
          type: 'Pulsaciones',
          value: heartRate,
          timestamp: currentTimestamp
        };

        this.sendVitalSignToBackend(newVitalSign);
        this.vitalSigns.push(newVitalSign);
        this.initializeChart();
        
        console.log(`Nueva lectura de pulsaciones: ${heartRate} bpm`);
        if (heartRate > 140) {
          console.warn('¡Alerta! Pulsaciones elevadas detectadas');
        }
      }
    });
}


  sendVitalSignToBackend(vitalSign: any) {
    const apiUrl = 'https://yzugk60fk4.execute-api.us-east-1.amazonaws.com/signos';

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.accessToken || ''
    });

    // Aseguramos que el objeto tenga el formato correcto
    const formattedVitalSign = {
      patientId: vitalSign.patientId,
      type: vitalSign.type,
      value: vitalSign.value,
      timestamp: vitalSign.timestamp
    };

    this.http.post(apiUrl, formattedVitalSign, { headers }).subscribe({
      next: (response) => {
        console.log('Señal vital enviada con éxito:', response);
      },
      error: (error) => {
        if (error.status === 200) {
          console.warn('El servidor respondió con 200 OK, pero Angular lo detectó como error. Ignorando...');
        } else {
          console.error('Error al enviar la señal vital:', error);
        }
      },
    });
  }

  startUpdatingAlerts() {
    // Cancelar la suscripción anterior si existe
    if (this.alertsUpdateSubscription) {
      this.alertsUpdateSubscription.unsubscribe();
    }

    // Crear nueva suscripción para actualizar cada 5 segundos
    this.alertsUpdateSubscription = interval(5000).subscribe(() => {
      if (this.selectedPatientId) {
        this.fetchAlerts();
      }
    });
  }

  selectPatient(patientId: number) {
    this.selectedPatientId = patientId;
    this.fetchVitalSigns();
    this.fetchAlerts();
    this.startUpdatingVitalSigns();
    this.startUpdatingAlerts();
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

        if (this.alertsUpdateSubscription) {
          this.alertsUpdateSubscription.unsubscribe();
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

  ngOnDestroy() {
    // Importante: limpiar las suscripciones cuando el componente se destruye
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
    if (this.alertsUpdateSubscription) {
      this.alertsUpdateSubscription.unsubscribe();
    }
    if (this.chart) {
      this.chart.destroy();
    }
  }

}
