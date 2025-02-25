
import { Signal } from "@preact/signals";
import { Card } from "../../components/Layouts/Card";
import { CustomComponent } from "../../utilities/component.utils";
import { useDetailsPageContext } from "./context";
import { Table } from "../../components/Table/Table";

export function MetadataCard({ className }: CustomComponent) {
  const { post } = useDetailsPageContext();
  if (!post?.value?.metadata) {
    return null;
  }

  return (
    <Card className={`col-span-4 md:col-span-2 h-fit ${className}`}>
      <h4>Metadata</h4>

      <Table
        entries={(post.value?.metadata).map((item) => new Signal(item))}
        headers={[
          { key: "name", label: "Name", className: "font-bold" },
          { key: "value", label: "Value", className: "text-ellipsis overflow-hidden" },
        ]}
      ></Table>
    </Card>
  );
}