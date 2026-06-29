import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { CopyPageButton } from './components/copy-page-button'

export function useMDXComponents(components) {
  const docs = getDocsMDXComponents()
  const DocsWrapper = docs.wrapper

  return {
    ...docs,
    ...components,
    wrapper(props) {
      const inner = (
        <>
          <CopyPageButton />
          {props.children}
        </>
      )
      return DocsWrapper ? <DocsWrapper {...props}>{inner}</DocsWrapper> : inner
    },
  }
}
