import { useMemo } from 'react'
import { Button, Divider } from 'openpype-components'
import ReactMarkdown from 'react-markdown'
import SettingsPanel from './settingsPanel'

function ObjectFieldTemplate(props) {
  let className = 'form-object-field'
  if (props.schema.layout) className += ` layout-${props.schema.layout}`

  //console.log(props.title, props.schema)

  // Highlight overrides and changed fields

  const objId = props.idSchema.$id
  const override = props.formContext.overrides[objId]
  const path = override?.path

  // TODO: actually use overrides
  // NOTE: after a few days, idk what this todo means

  // TODO: originally used for context menus. I hope we won't need it again.
  // let labelStyle = {}
  // let rmOverrideFunc = null
  // let pinOverrideFunc = null
  // if (override) {
  //   if (override?.inGroup) labelStyle.fontStyle = 'italic'
  //   else if (override.level === props.formContext.level)
  //     rmOverrideFunc = () => {
  //       props.formContext.onDeleteOverride(path)
  //     }
  // }
  // if (!override || override.level !== props.formContext.level) {
  //   pinOverrideFunc = () => {
  //     props.formContext.onPinOverride(path)
  //   }
  // }

  let overrideLevel = useMemo(() => {
    let res = 'default'
    for (const childId in props.formContext.overrides) {
      if (!childId.startsWith(`${objId}_`)) continue // not a child of this object
      const child = props.formContext.overrides[childId]

      if (props.formContext.changedKeys.includes(childId)) {
        res = 'edit'
        break
      }

      if (child.level === 'studio' && res === 'default') res = 'studio'
      else if (child.level === 'project' && res !== 'edit') res = 'project'
    }
    return res
    // form data's here, because formContext.overrides is not triggered :/
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    { ...props.formContext.overrides },
    [...props.formContext.changedKeys],
    objId,
    props.formData,
  ])

  if (props.schema.isgroup && overrideLevel === 'edit') {
    className += ' group-changed'
  }

  // Object descrtiption (from docstrings)

  const shortDescription =
    props.schema.description && props.schema.description.split('\n')[0]

  const longDescription = props.schema.description && (
    <div className="form-object-field-help">
      <ReactMarkdown>{props.schema.description}</ReactMarkdown>
    </div>
  )

  // memoize the fields

  const enabledToggler = useMemo(() => {
    for (const element of props.properties) {
      if (element.name === 'enabled') {
        return (
          <span className="form-object-header-enabled-toggler">
            {element.content}
          </span>
        )
      }
    }
  }, [props.properties])

  const fields = useMemo(() => {
    let hiddenFields = []
    for (const propName in props?.schema?.properties || {}) {
      const ppts = props?.schema?.properties[propName]
      if (ppts.scope === 'hidden') {
        hiddenFields.push(propName)
      }
      if (ppts.conditionalEnum) {
        hiddenFields = [
          ...hiddenFields,
          ...ppts.enum.filter((e) => e !== props.formData[propName]),
        ]
      }
    }

    if (props.schema.layout === 'expanded') {
      let nameField = null
      let otherFields = []

      for (const element of props.properties) {
        if (element.name === 'name') nameField = element.content
        else otherFields.push(element.content)
      }
      return (
        <>
          {longDescription}
          <div className={className}>
            <div className="name-field">{nameField}</div>
            <div className="data-fields">
              {otherFields
                .filter((f) => !hiddenFields.includes(f.props.name))
                .map((element) => element)}
            </div>
          </div>
        </>
      )
    } // ugly layout

    return (
      <>
        {longDescription}
        <div className={className}>
          {props.properties
            .filter(
              (element) =>
                (element.name !== 'enabled' ||
                  ['compact', 'root'].includes(props.schema.layout)) &&
                !hiddenFields.includes(element.name)
            )
            .map((element, index) => (
              <div key={index} className="form-object-field-item">
                {element.content}
              </div>
            ))}
        </div>
      </>
    )
  }, [props.properties, className])

  // aaand... render

  if (['compact', 'root', 'expanded'].includes(props.schema.layout))
    return fields

  // In case of "pseudo-dicts" (array of objects with a "name" attribute)
  // use the "name" attributeas the title

  let title = props.title
  if ('name' in props.schema.properties) {
    let label = null
    if ('label' in props.schema.properties) label = props.formData.label
    title = label || props.formData.name || (
      <span className="new-object">Unnamed item</span>
    )
  }

  return (
    <SettingsPanel
      objId={objId}
      onClick={() => {
        if (props.formContext.onSetBreadcrumbs)
          props.formContext.onSetBreadcrumbs(path)
      }}
      title={title}
      description={shortDescription}
      className={`obj-override-${overrideLevel}`}
      enabledToggler={enabledToggler}
    >
      {fields}
    </SettingsPanel>
  )
}

function FieldTemplate(props) {
  // Do not render the field if it belongs to a different scope (studio/project) or if it is hidden
  if (
    props.schema.scope &&
    (props.schema.scope !== props.formContext.level ||
      props.schema.scope === 'hidden')
  )
    return null

  const divider = useMemo(() => {
    if (props.schema.section)
      return (
        <Divider>
          {props.schema.section !== '---' && props.schema.section}
        </Divider>
      )
    else return <></>
  }, [props.schema.section])

  // Object fields

  if (props.schema.type === 'object') 
    return <>{divider}{props.children}</>
  

  //
  // Solve overrides for lists and leaves
  //

  const override = props.formContext.overrides
    ? props.formContext.overrides[props.id]
    : null

  const fieldChanged = props.formContext.changedKeys.includes(props.id)
  const overrideLevel = fieldChanged
    ? 'edit'
    : override
    ? override.level
    : 'default'

  let labelStyle = {}

  if (override) {
    if (override?.inGroup) labelStyle.fontStyle = 'italic'
  }

  // Array fields

  if (
    props.schema.type === 'array' &&
    props.schema.items.type !== 'string' &&
    props.schema.layout !== 'compact'
  ) {
    let className

    for (const childId of props.formContext.changedKeys) {
      if (!childId.startsWith(`${props.id}_`)) continue // not a child of this object
      className = 'obj-override-edit group-changed'
      break
    }

    if (!className) className = `obj-override-${overrideLevel}`
    return (
      <SettingsPanel
        objId={props.id}
        title={props.schema.title}
        description={props.schema.description}
        className={className}
        onClick={() => {
          if (props.formContext.onSetBreadcrumbs && override?.path)
            props.formContext.onSetBreadcrumbs(override.path)
        }}
      >
        {props.children}
      </SettingsPanel>
    )
  }

  // Leaves
  
  const widgetClass =
    props.schema.type === 'array' &&
    props.schema.layout === 'compact' &&
    props.formData?.length
      ? 'left-border'
      : ''


  // do not show error for color widgets (they are declared as strings, but
  // contains arrays. The error is not relevant for the user)
  const className = `form-inline-field ${
    (props.errors.props.errors && (props.schema.widget !== 'color')) ? 'error' : ''
  }`

  return (
    <>
      {divider}
      <div className={className} >
        {props.label && (
          <div
            className={`form-inline-field-label ${
              props.rawDescription ? 'field-label' : ''
            } ${overrideLevel}`}
            data-pr-tooltip={`${
              props.rawDescription ? props.rawDescription : ''
            }`}
          >
            <span
              onClick={() => {
                if (props.formContext.onSetBreadcrumbs)
                  props.formContext.onSetBreadcrumbs(override.path)
              }}
              style={labelStyle}
            >
              {props.label}
            </span>
          </div>
        )}
        <div className={`form-inline-field-widget ${widgetClass}`}>
          {props.children}
        </div>
        <div className="form-inline-field-help">
          {props.rawDescription && (
            <div>
              <ReactMarkdown>{props.rawDescription}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const ArrayItemTemplate = (props) => {
  const parentSchema = props?.children?._owner?.memoizedProps?.schema || {}
  const itemName = props?.children?.props?.formData?.name   
  let undeletable = false

  const children = props.children

  if (itemName && (parentSchema.requiredItems || []).includes(itemName)) {
    undeletable = true
    if (children.props.formData.name === itemName)
      children.props.schema.properties.name.fixedValue = itemName
  }
    
  const rmButton = props.hasRemove && (
    <div className="array-item-controls">
      <Button
        onClick={props.onDropIndexClick(props.index)}
        className="circle"
        icon="close"
        disabled={undeletable}
      />
      <Button
        onClick={props.onReorderClick(props.index, props.index - 1)}
        className="circle"
        icon="arrow_upward"
      />
      <Button
        onClick={props.onReorderClick(props.index, props.index + 1)}
        className="circle"
        icon="arrow_downward"
      />
    </div>
  )

  return (
    <div className="form-array-field-item">
      {children}
      {rmButton}
    </div>
  )
}

const ArrayFieldTemplate = (props) => {
  /* Complete array including the add button */
  return (
    <div className="form-array-field">
      {props.items.map((element) => (
        <ArrayItemTemplate key={element.name} {...element} />
      ))}
      {props.canAdd && (
        <Button onClick={props.onAddClick} className="circle" icon="add" />
      )}
    </div>
  )
}

export { ObjectFieldTemplate, FieldTemplate, ArrayFieldTemplate }
