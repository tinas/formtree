import type { ArrayDefinition, ArrayItem, ArrayNode, NodeOf } from '@formtree/core'
import type { lineItemGroup } from './forms/checkout'

import { PRODUCTS, saveLineItem } from './api'
import { applyAttributes, fillOptions, formatValue, parseNumber, parseText } from './dom/bindings'

type LineItemNode = NodeOf<typeof lineItemGroup> & ArrayItem

export interface LineItemsBinding {
  readonly node: ArrayNode<ArrayDefinition<typeof lineItemGroup>>
  readonly container: HTMLElement
  readonly template: HTMLTemplateElement
  readonly addButton: HTMLButtonElement
  readonly message: HTMLElement
}

interface RowView {
  readonly row: LineItemNode
  readonly element: HTMLElement
  readonly product: HTMLSelectElement
  readonly quantity: HTMLInputElement
  readonly save: HTMLButtonElement
  readonly status: HTMLElement
  readonly productError: HTMLElement
  readonly quantityError: HTMLElement
  readonly stops: Array<() => void>
}

interface ShownItems {
  items: ReadonlyArray<LineItemNode> | undefined
}

export function bindLineItems(binding: LineItemsBinding): () => void {
  const views = new Map<string, RowView>()
  const shown: ShownItems = { items: undefined }
  binding.addButton.addEventListener('click', () => binding.node.push({ quantity: 1 }))
  renderLineItems({ binding, views, shown })
  return binding.node.subscribe(() => renderLineItems({ binding, views, shown }))
}

interface LineItemsView {
  readonly binding: LineItemsBinding
  readonly views: Map<string, RowView>
  readonly shown: ShownItems
}

function renderLineItems({ binding, views, shown }: LineItemsView): void {
  binding.message.textContent = binding.node.errorMessage ?? ''
  const { items } = binding.node
  if (items == shown.items) {
    return
  }
  shown.items = items
  const keys = new Set(items.map(row => row.key))
  for (const [key, view] of views) {
    if (!keys.has(key)) {
      view.stops.forEach(stop => stop())
      views.delete(key)
    }
  }
  binding.container.replaceChildren(...items.map(row => rowViewOf({ binding, views, shown }, row).element))
}

function rowViewOf({ binding, views }: LineItemsView, row: LineItemNode): RowView {
  const existing = views.get(row.key)
  if (existing != undefined) {
    return existing
  }
  const view = createRowView(binding, row)
  views.set(row.key, view)
  return view
}

function createRowView(binding: LineItemsBinding, row: LineItemNode): RowView {
  const element = binding.template.content.firstElementChild?.cloneNode(true) as HTMLElement
  const view: RowView = {
    row,
    element,
    product: element.querySelector('.product') as HTMLSelectElement,
    quantity: element.querySelector('.quantity') as HTMLInputElement,
    save: element.querySelector('.save') as HTMLButtonElement,
    status: element.querySelector('.status') as HTMLElement,
    productError: element.querySelector('.product-error') as HTMLElement,
    quantityError: element.querySelector('.quantity-error') as HTMLElement,
    stops: [],
  }
  fillOptions(
    view.product,
    PRODUCTS.map(product => {
      return {
        value: product.sku,
        label: product.name,
      }
    }),
  )
  const sku = row.field('sku')
  const quantity = row.field('quantity')
  view.product.addEventListener('change', () => sku.setValue(parseText(view.product.value)))
  view.product.addEventListener('blur', () => sku.blur())
  view.quantity.addEventListener('input', () => quantity.setValue(parseNumber(view.quantity.value)))
  view.quantity.addEventListener('blur', () => quantity.blur())
  view.save.addEventListener(
    'click',
    row.handleSubmit(async item => {
      row.reset({ value: await saveLineItem(item) })
    }),
  )
  element.querySelector('.remove')?.addEventListener('click', () => binding.node.remove(row.index))
  renderProduct(view)
  renderQuantity(view)
  renderStatus(view)
  view.stops.push(
    sku.subscribe(() => renderProduct(view)),
    quantity.subscribe(() => renderQuantity(view)),
    row.subscribe(() => renderStatus(view)),
  )
  return view
}

function renderProduct(view: RowView): void {
  const sku = view.row.field('sku')
  applyAttributes(view.product, sku.attributes)
  view.productError.id = sku.errorId
  view.productError.textContent = sku.errorMessage ?? ''
  view.product.value = sku.state.value ?? ''
}

function renderQuantity(view: RowView): void {
  const quantity = view.row.field('quantity')
  applyAttributes(view.quantity, quantity.attributes)
  view.quantityError.id = quantity.errorId
  view.quantityError.textContent = quantity.errorMessage ?? ''
  if (view.quantity.value != formatValue(quantity.state.value)) {
    view.quantity.value = formatValue(quantity.state.value)
  }
}

function renderStatus(view: RowView): void {
  const { state } = view.row
  const isSaved = state.value.id != undefined
  view.save.setAttribute('aria-disabled', String(isSaved && !state.dirty))
  view.status.textContent = rowStatus({ isSaved, isDirty: state.dirty, isSubmitting: state.submitting })
}

interface RowStatusInput {
  readonly isSaved: boolean
  readonly isDirty: boolean
  readonly isSubmitting: boolean
}

function rowStatus({ isSaved, isDirty, isSubmitting }: RowStatusInput): string {
  if (isSubmitting) {
    return 'Saving…'
  }
  if (!isSaved) {
    return 'Not saved'
  }
  return isDirty ? 'Unsaved changes' : 'Saved'
}
