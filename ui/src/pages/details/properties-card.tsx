import { Card } from "../../components/Layouts/Card";
import { CustomComponent } from "../../utilities/component.utils";
import { useDetailsPageContext } from "./context";

export function PropertiesCard({}: CustomComponent) {
  const { post } = useDetailsPageContext();

  return (
    <Card className="col-span-4 md:col-span-3">
      <h2>Post Details</h2>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <label htmlFor="label">Label</label>
          <input value={post.value?.label} className="w-full" />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="label">Author</label>
          <input value={post.value?.author} className="w-full" />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="label">Source</label>
          <input value={post.value?.source} className="w-full" />
        </div>
      </div>
    </Card>
  );
}