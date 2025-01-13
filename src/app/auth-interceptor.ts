import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private msalService: MsalService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const account = this.msalService.instance.getActiveAccount();
    if (!account) {
      // Si no hay una cuenta activa, continúa sin adjuntar el token
      return next.handle(req);
    }

    return this.msalService.acquireTokenSilent({
      account,
      scopes: ['https://cnsem1b2c.onmicrosoft.com/ebe5cc75-054a-447f-8d86-eaf1dbade5d5/azure_aws'],
    }).pipe(
      switchMap((result) => {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${result.accessToken}`,
          },
        });
        return next.handle(authReq);
      })
    );
  }
}
