import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Button } from 'openpype-components'
import { toast } from 'react-toastify'

const Breadcrumbs = () => {
  /*
    Breadcrums component used in the browser view.

    Current location is taken from the redux store as an Object
    containing all the components of the current path.
    This allows to render the breadcrumbs as well as compile the
    op:// USD uri.
    */

  const context = useSelector((state) => ({ ...state.context }))
  const crumbData = context.breadcrumbs || {}
  const projectName = context.projectName

  const [breadcrumbs, uri] = useMemo(() => {
    let crumbs = [projectName]
    let uri = `op://${projectName}/`
    for (const h of crumbData.parents || []) {
      crumbs.push(h)
      uri += `${h}/`
    }
    if (crumbData.folder) {
      crumbs.push(crumbData.folder)
      uri += crumbData.folder
    }

    if (crumbData.subset) {
      crumbs.push(crumbData.subset)
      uri += `?subset=${crumbData.subset}`
    }

    if (crumbData.version) {
      crumbs.push(crumbData.version)
      uri += `?version=${crumbData.version}`
    }

    if (crumbData.representation) {
      crumbs.push(crumbData.representation)
      uri += `?representation=${crumbData.representation}`
    }

    return [crumbs, uri]
  }, [
    crumbData.parents,
    crumbData.folder,
    crumbData.subset,
    crumbData.version,
    crumbData.representation,
    projectName,
  ])

  const copyURI = () => {
    navigator.clipboard.writeText(uri).then(
      () => {
        toast.success('URI copied')
      },
      (err) => {
        toast.error('Could not copy text: ', err)
      }
    )
  }

  if (!projectName) return <></>

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <ul className="breadcrumbs">
        {breadcrumbs.map((crumb, index) => (
          <li key={index}>{crumb}</li>
        ))}
      </ul>

      <Button
        icon="content_copy"
        className="transparent copy-uri-button"
        onClick={copyURI}
        tooltip="Copy URI to clipboard"
        tooltipPosition="bottom"
        disabled={!breadcrumbs}
      />
    </div>
  )
}

export default Breadcrumbs
