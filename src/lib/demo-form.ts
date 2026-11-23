export type DemoFormState = { error?: string; success?: string };
export type DemoFormAction = (state: DemoFormState, data: FormData) => Promise<DemoFormState>;
