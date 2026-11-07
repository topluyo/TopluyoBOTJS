export interface FormInteractionData {
  form: Record<string, string>;
  submit: string;
  post_id: number;
  user_id: number;
}

export class FormInteraction implements FormInteractionData {
  readonly form: Record<string, string>;
  readonly submit: string;
  readonly post_id: number;
  readonly user_id: number;

  constructor(data: FormInteractionData) {
    this.form = data.form;
    this.submit = data.submit;
    this.post_id = data.post_id;
    this.user_id = data.user_id;
  }
}
