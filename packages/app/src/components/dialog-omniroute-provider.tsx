import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Button } from "@opencode-ai/ui/button"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { TextField } from "@opencode-ai/ui/text-field"
import { showToast } from "@/utils/toast"
import type { Component } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/context/language"
import { useServerSDK } from "@/context/server-sdk"
import { useServerSync } from "@/context/server-sync"
import { useMutation } from "@tanstack/solid-query"

export const OMNIROUTE_PROVIDER_ID = "omniroute"
export const OMNIROUTE_ID = "_omniroute"

export const OmnirouteProviderForm: Component<{
  autofocus?: boolean
}> = (props) => {
  const dialog = useDialog()
  const language = useLanguage()
  const serverSDK = useServerSDK()
  const serverSync = useServerSync()

  const [form, setForm] = createStore({
    baseURL: "",
    apiKey: "",
    err: {} as { baseURL?: string; apiKey?: string },
  })

  const validate = () => {
    const baseURL = form.baseURL.trim()
    const apiKey = form.apiKey.trim()
    const err = {
      baseURL: !baseURL
        ? language.t("provider.custom.error.baseURL.required")
        : !/^https?:\/\//.test(baseURL)
          ? language.t("provider.custom.error.baseURL.format")
          : undefined,
      apiKey: !apiKey ? language.t("provider.custom.error.required") : undefined,
    }
    setForm("err", err)
    if (err.baseURL || err.apiKey) return
    return { baseURL: baseURL.replace(/\/+$/, ""), apiKey }
  }

  const saveMutation = useMutation(() => ({
    mutationFn: async (result: NonNullable<ReturnType<typeof validate>>) => {
      if ((await serverSDK().protocol) !== "v1") throw new Error(language.t("provider.custom.unavailable"))
      await serverSDK().client.auth.set({
        providerID: OMNIROUTE_PROVIDER_ID,
        auth: {
          type: "api",
          key: result.apiKey,
        },
      })
      await serverSync().updateConfig({
        provider: {
          [OMNIROUTE_PROVIDER_ID]: {
            npm: "@ai-sdk/openai-compatible",
            name: "OmniRoute",
            options: { baseURL: result.baseURL },
          },
        },
      })
      await serverSync().refreshProviders()
      return result
    },
    onSuccess: () => {
      dialog.close()
      showToast({
        variant: "success",
        icon: "circle-check",
        title: language.t("provider.connect.toast.connected.title", { provider: "OmniRoute" }),
        description: language.t("provider.connect.toast.connected.description", { provider: "OmniRoute" }),
      })
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      showToast({ title: language.t("common.requestFailed"), description: message })
    },
  }))

  const save = (e: SubmitEvent) => {
    e.preventDefault()
    if (saveMutation.isPending) return

    const result = validate()
    if (!result) return
    saveMutation.mutate(result)
  }

  return (
    <div class="flex flex-col gap-6 px-2.5 pb-3 overflow-y-auto max-h-[60vh]">
      <div class="px-2.5 flex gap-4 items-center">
        <ProviderIcon id="synthetic" class="size-5 shrink-0 icon-strong-base" />
        <div class="text-16-medium text-text-strong">{language.t("provider.omniroute.title")}</div>
      </div>

      <form onSubmit={save} class="px-2.5 pb-6 flex flex-col gap-6">
        <p class="text-14-regular text-text-base">{language.t("provider.omniroute.description")}</p>

        <div class="flex flex-col gap-4">
          <TextField
            autofocus={props.autofocus ?? true}
            label={language.t("provider.custom.field.baseURL.label")}
            placeholder={language.t("provider.omniroute.field.baseURL.placeholder")}
            value={form.baseURL}
            onChange={(v) => setForm("baseURL", v)}
            validationState={form.err.baseURL ? "invalid" : undefined}
            error={form.err.baseURL}
          />
          <TextField
            label={language.t("provider.custom.field.apiKey.label")}
            placeholder={language.t("provider.custom.field.apiKey.placeholder")}
            value={form.apiKey}
            onChange={(v) => setForm("apiKey", v)}
            validationState={form.err.apiKey ? "invalid" : undefined}
            error={form.err.apiKey}
          />
        </div>

        <Button class="w-auto self-start" type="submit" size="large" variant="primary" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? language.t("common.saving") : language.t("common.submit")}
        </Button>
      </form>
    </div>
  )
}
