import type { setupDevtoolsPlugin } from '@vue/devtools-api'

export type DevtoolsApi = Parameters<Parameters<typeof setupDevtoolsPlugin>[1]>[0]

type InspectorTreePayload = Parameters<Parameters<DevtoolsApi['on']['getInspectorTree']>[0]>[0]

type InspectorStatePayload = Parameters<Parameters<DevtoolsApi['on']['getInspectorState']>[0]>[0]

export type InspectorNode = InspectorTreePayload['rootNodes'][number]

export type InspectorTag = NonNullable<InspectorNode['tags']>[number]

export type InspectorState = InspectorStatePayload['state']

export type TimelineEvent = Parameters<DevtoolsApi['addTimelineEvent']>[0]['event']
