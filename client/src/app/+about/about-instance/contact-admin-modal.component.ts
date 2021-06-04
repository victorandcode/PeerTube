import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core'
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router'
import { Subject } from 'rxjs'
import { takeUntil, filter } from 'rxjs/operators'
import { Notifier, ServerService } from '@app/core'
import {
  BODY_VALIDATOR,
  FROM_EMAIL_VALIDATOR,
  FROM_NAME_VALIDATOR,
  SUBJECT_VALIDATOR
} from '@app/shared/form-validators/instance-validators'
import { FormReactive, FormValidatorService } from '@app/shared/shared-forms'
import { InstanceService } from '@app/shared/shared-instance'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal/modal-ref'
import { HttpStatusCode } from '@shared/core-utils/miscs/http-error-codes'
import { HTMLServerConfig } from '@shared/models'

@Component({
  selector: 'my-contact-admin-modal',
  templateUrl: './contact-admin-modal.component.html',
  styleUrls: [ './contact-admin-modal.component.scss' ]
})
export class ContactAdminModalComponent extends FormReactive implements OnInit, OnDestroy {
  @ViewChild('modal', { static: true }) modal: NgbModal

  error: string
  destroy = new Subject<any>()

  subject: string

  private openedModal: NgbModalRef
  private serverConfig: HTMLServerConfig

  constructor (
    protected formValidatorService: FormValidatorService,
    private modalService: NgbModal,
    private instanceService: InstanceService,
    private serverService: ServerService,
    private notifier: Notifier,
    private route: ActivatedRoute,
    private router: Router
  ) {
    super()
  }

  get instanceName () {
    return this.serverConfig.instance.name
  }

  get isContactFormEnabled () {
    return this.serverConfig.email.enabled && this.serverConfig.contactForm.enabled
  }

  ngOnInit () {
    this.serverConfig = this.serverService.getHTMLConfig()

    this.buildForm({
      fromName: FROM_NAME_VALIDATOR,
      fromEmail: FROM_EMAIL_VALIDATOR,
      subject: SUBJECT_VALIDATOR,
      body: BODY_VALIDATOR
    })

    // Direct access
    if (/^\/about\/instance\/contact/.test(this.router.url)) {
      this.show()
      this.prefillForm()
    }

    // Router access
    this.router.events
      .pipe(
        takeUntil(this.destroy),
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        if (/^\/about\/instance\/contact/.test(event.url)) {
          this.show()
          this.prefillForm()
        }
      })
  }

  ngOnDestroy () {
    this.destroy.next()
  }

  show () {
    // If contactForm not enabled redirect to 404
    if (!this.isContactFormEnabled) {
      return this.router.navigate([ '/404' ], { state: { type: 'other', obj: { status: 404 } }, skipLocationChange: true })
    }

    // Open modal
    this.openedModal = this.modalService.open(this.modal, { centered: true, keyboard: false })

    // Go back to /about/instance after the modal is closed
    this.openedModal.result.then(() => {
      this.router.navigateByUrl('/about/instance')
    }, () => {
      this.router.navigateByUrl('/about/instance')
    })
  }

  hide () {
    this.form.reset()
    this.error = undefined

    this.openedModal.close()
    this.openedModal = null
  }

  sendForm () {
    const fromName = this.form.value[ 'fromName' ]
    const fromEmail = this.form.value[ 'fromEmail' ]
    const subject = this.form.value[ 'subject' ]
    const body = this.form.value[ 'body' ]

    this.instanceService.contactAdministrator(fromEmail, fromName, subject, body)
        .subscribe(
          () => {
            this.notifier.success($localize`Your message has been sent.`)
            this.hide()
          },

          err => {
            this.error = err.status === HttpStatusCode.FORBIDDEN_403
              ? $localize`You already sent this form recently`
              : err.message
          }
        )
  }

  private prefillForm () {
    const { subject, body } = this.route.snapshot.queryParams

    if (subject) {
      this.form.get('subject').setValue(subject)
    }

    if (body) {
      this.form.get('body').setValue(body)
    }
  }
}
