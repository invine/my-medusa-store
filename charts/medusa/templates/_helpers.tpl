{{- define "medusa.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "medusa.fullname" -}}
{{- include "medusa.name" . -}}
{{- end -}}

{{- define "medusa.labels" -}}
app.kubernetes.io/name: {{ include "medusa.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "medusa.selectorLabels" -}}
app.kubernetes.io/name: {{ include "medusa.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "medusa.secretName" -}}
{{- .Values.secrets.name -}}
{{- end -}}

{{- define "medusa.databaseUrl" -}}
postgres://{{ .Values.postgres.username }}:$(POSTGRES_PASSWORD)@{{ .Values.postgres.name }}:{{ .Values.postgres.port }}/{{ .Values.postgres.database }}
{{- end -}}

{{- define "medusa.redisUrl" -}}
redis://{{ .Values.redis.name }}:{{ .Values.redis.port }}
{{- end -}}
