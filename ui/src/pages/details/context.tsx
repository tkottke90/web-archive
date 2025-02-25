import { batch, Signal, useSignal, useSignalEffect } from "@preact/signals";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { PostDTO } from "../../../../server/src/dto/post.dto";
import * as PostService from '../../services/post.service';
import { CustomComponent } from "../../utilities/component.utils";

const defaultContext = {
  post: new Signal<PostDTO | undefined>(undefined),
  path: new Signal(''),

  loading: new Signal(false),
  showDeleteModal: new Signal<boolean>(false),

  prevPost: new Signal(''),
  nextPost: new Signal('')
}

const pageContext = createContext(defaultContext)

export function DetailsPageContext({ children }: CustomComponent) {
  const path = useSignal(window.location.pathname);
  const prevPost = useSignal(window.location.pathname);
  const nextPost = useSignal(window.location.pathname);
  const post = useSignal<PostDTO | undefined>(undefined);

  const showDeleteModal = useSignal(false);
  const loading = useSignal(true);

  useSignalEffect(() => {
    loading.value = true;

    PostService.postDetails(path.value)
      .then(async (result) => {
        const newSiblings = await PostService.getSiblingPosts(result.id)

        batch(() => {
          post.value = result;
          loading.value = false;
          nextPost.value = newSiblings.next,
          prevPost.value = newSiblings.previous
        })
      })
      .finally(() => {
        loading.value = false;
      })
  })

  return (
    <pageContext.Provider value={{ path, prevPost, nextPost, post, showDeleteModal, loading }}>
      {children}
    </pageContext.Provider>
  )
}

export function useDetailsPageContext() {
  return useContext(pageContext);
}