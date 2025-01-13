import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http'; // Importar HttpClientModule

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// MSAL
import { MsalModule } from '@azure/msal-angular';
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';

(async () => {
  // 1) Creas tu instancia de MSAL:
  const pca = new PublicClientApplication({
    auth: {
      clientId: 'ebe5cc75-054a-447f-8d86-eaf1dbade5d5',
      authority: 'https://login.microsoftonline.com/36300af5-6b8e-4d2d-b472-7eab061249ee',
      redirectUri: 'http://localhost:4200',
    },
  });

  // 2) Esperas su inicialización
  await pca.initialize();

  // 3) Ahora sí importas MsalModule con esa instancia
  bootstrapApplication(AppComponent, {
    providers: [
      ...appConfig.providers,
      importProvidersFrom(
        BrowserModule,
        HttpClientModule, // Agregar HttpClientModule
        MsalModule.forRoot(
          pca,
          {
            interactionType: InteractionType.Popup,
            authRequest: { scopes: ['user.read'] },
          },
          {
            interactionType: InteractionType.Redirect,
            protectedResourceMap: new Map([
              ['https://graph.microsoft.com/v1.0/me', ['user.read']],
            ]),
          }
        )
      ),
    ]
  })
    .catch(err => console.error(err));
})();
