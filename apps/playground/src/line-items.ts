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
}

export function bindLineItems(binding: LineItemsBinding): () => void {
  const views = new Map<string, RowView>()
  binding.addButton.addEventListener('click', () => binding.node.push({ quantity: 1 }))
  return () => renderLineItems(binding, views)
}

function renderLineItems(binding: LineItemsBinding, views: Map<string, RowView>): void {
  const rows = binding.node.items.map(row => {
    const view = views.get(row.key) ?? createRowView(binding, row)
    views.set(row.key, view)
    renderRow(view)
    return view.element
  })
  binding.container.replaceChildren(...rows)
  binding.message.textContent = binding.node.errorMessage ?? ''
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
  view.product.addEventListener('change', () => row.field('sku').setValue(parseText(view.product.value)))
  view.product.addEventListener('blur', () => row.field('sku').blur())
  view.quantity.addEventListener('input', () => row.field('quantity').setValue(parseNumber(view.quantity.value)))
  view.quantity.addEventListener('blur', () => row.field('quantity').blur())
  view.save.addEventListener(
    'click',
    row.handleSubmit(async item => {
      row.reset({ value: await saveLineItem(item) })
    }),
  )
  element.querySelector('.remove')?.addEventListener('click', () => binding.node.remove(row.index))
  return view
}

function renderRow(view: RowView): void {
  const { state } = view.row
  const sku = view.row.field('sku')
  const quantity = view.row.field('quantity')
  applyAttributes(view.product, sku.attributes)
  applyAttributes(view.quantity, quantity.attributes)
  view.productError.id = sku.errorId
  view.quantityError.id = quantity.errorId
  view.productError.textContent = sku.errorMessage ?? ''
  view.quantityError.textContent = quantity.errorMessage ?? ''
  view.product.value = sku.state.value ?? ''
  if (view.quantity.value != formatValue(quantity.state.value)) {
    view.quantity.value = formatValue(quantity.state.value)
  }
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
