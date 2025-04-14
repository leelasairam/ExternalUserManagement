import { LightningElement,track } from 'lwc';
import GetExternalUsers from '@salesforce/apex/ManageExternalUsers.GetExternalUsers';
import GetTasks from '@salesforce/apex/ManageExternalUsers.GetTasks';
import CreateResource from '@salesforce/apex/ManageExternalUsers.CreateResource';
import updateResource from '@salesforce/apex/ManageExternalUsers.updateResource';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class ExternalUserManagement extends LightningElement {
    @track Users;
    @track Tasks;
    editUserModal = false;
    newUserModal = false;
    newTaskModal = false;
    viewTaskModal = false;
    loading = false;
    @track query='';
    @track page = 1;
    @track uid;
    resourceName = 'users';
    @track editUserVlaues;
    disableNextBtn = false;
    containerLoading = false;
    @track cacheRecord = new Map();

    get priorityOptions() {
        return [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'Medium' },
            { label: 'High', value: 'high' },
        ];
    }
    async FetchExternalUsers(){
        if(this.cacheRecord.has(this.page)){
            this.Users = this.cacheRecord.get(this.page);
            console.log('executed cache');
            return;
        }
        this.loading = true;
        await GetExternalUsers({resourceName:this.resourceName,query:this.query})
        .then(result=>{
            const tempRes = result.map(i=>({...i, customClass : i.IsActive ? 'dot-green' : 'dot-red'}))
            this.cacheRecord.set(this.page,tempRes);
            if(tempRes.length<5){
                this.disableNextBtn = true;
            }
            this.Users =tempRes;
            console.log(this.Users[0]);
        })
        .catch(error=>{
            this.disableNextBtn = true;
            console.log(error);
        })
        this.loading = false;
    }

    connectedCallback(){
        this.query = `?page=${this.page}&limit=5&sortBy=LastModified&order=desc`;
        this.FetchExternalUsers();
    }

    toast(title,msg,varient) {
        const event = new ShowToastEvent({
            title: title,
            message: msg,
            variant: varient,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }

    handleBtnActions(event){
        const btn = event.target.dataset.btn;
        this.uid = event.target.dataset.uid;
        console.log(btn,this.uid);
        if(btn === 'editUser'){
            this.editUserModal = true;
            this.editUserVlaues = this.Users.find(user => user.id === this.uid);
        }
        else if(btn === 'newUser'){
            this.newUserModal = true;
        }
        else if(btn === 'newTask'){
            this.newTaskModal = true;
        }
        else if(btn === 'viewTask'){
            this.viewTaskModal = true;
            this.fetchUserTasks();
        }

    }

    handleSave(event){
        const btn = event.target.dataset.btn;
        const formMap = {
            editSave: this.refs.editForm,
            newSave: this.refs.newForm,
            newTaskSave: this.refs.newTaskForm
        };
        const container = formMap[btn] || null;
        if(container!==null){
            const inputs = container.querySelectorAll('lightning-input, lightning-input-rich-text, lightning-combobox');
            let values = {};
            inputs.forEach(input => {
                values[input.name] = input.type === 'checkbox' ? input.checked : input.value;
            });
            console.log('Input Values:', values);
            const isoTodayDate = new Date().toISOString();
            if(btn==='newSave'){
                this.InsertNewResource('users',{...values,createdAt:isoTodayDate,LastModified:isoTodayDate});
            }
            else if(btn==='editSave'){
                console.log(`users#/${this.uid}`);
                this.EditResource(`users#/${this.uid}`,{...values,LastModified:isoTodayDate});
            }
            else if(btn==='newTaskSave'){
                this.InsertNewResource('Tasks',{...values,createdAt:isoTodayDate,IsCompleted:false,UserId:this.uid});
            }
        }
    }

    async fetchUserTasks(){
        this.containerLoading = true;
        await GetTasks({resourceName:'Tasks',query:`?UserId=${this.uid}&sortBy=createdAt&order=desc`})
        .then(result=>{
            console.log(result.statusCode);
            if(result.statusCode!='200'){
                this.toast('Info',result.responseBody,'info');
            }
            else{
                this.Tasks = result.responseBody;
                console.log(this.Tasks[0].Subject);
            }
        })
        .catch(error=>{
            this.toast('Error',error,'error');
            console.log(error);
        })
        .finally(()=>{
            this.containerLoading = false;
        })
    }

    async InsertNewResource(resource,jsonBody){
        this.loading=true;
        await CreateResource({resourceName:resource,Body:jsonBody})
        .then(result=>{
            if(result.statusCode!=='201'){
                this.toast('Error',result.responseBody,'error');
                console.log(result.responseBody);
                //this.handleModalCancel();
            }
            else{
                this.toast('sucess','Created successfully','success');
                const newResource = JSON.parse(result.responseBody);
                if(resource==='users'){
                    this.Users = [{...newResource,customClass : newResource.IsActive ? 'dot-green' : 'dot-red',name:newResource.Name},...this.Users];
                }
                this.handleModalCancel();
            }
        })
        .catch(error=>{
            console.log(error);
            this.toast('Error','Error occoured','error');
        })
        .finally(()=>{
            this.loading=false;
        })
    }

    async EditResource(resource,jsonBody){
        this.loading=true;
        await updateResource({resourceNameANDId:resource,Body:jsonBody})
        .then(result=>{
            if(result.statusCode!=='200'){
                this.toast('Error',result.responseBody,'error');
                console.log(result.responseBody);
                //this.handleModalCancel();
            }
            else{
                this.toast('sucess','Updated successfully','success');
                console.log(JSON.parse(result.responseBody));
                const updatedResource = JSON.parse(result.responseBody);
                if(resource.startsWith("users")){
                    const tempUsers = this.Users.filter(user=>user.id!=updatedResource.id);
                    this.Users = [{...updatedResource,customClass : updatedResource.IsActive ? 'dot-green' : 'dot-red',name:updatedResource.Name},...tempUsers];
                    console.log('first user',this.Users[0]);
                }   
                this.handleModalCancel();
            }
        })
        .catch(error=>{
            console.log(error);
            this.toast('Error','Error occoured','error');
        })
        .finally(()=>{
            this.loading=false;
        })
    }

    handleModalCancel(){
        this.newUserModal = false;
        this.editUserModal = false;
        this.newTaskModal = false;
        this.viewTaskModal = false;
    }

    handlePagination(event){
        const btn = event.target.dataset.btn;
        if(btn==='next'){
            this.page+=1;
        }
        else if(btn==='prev'){
            if(this.page>1){
                this.page-=1;
                if(this.disableNextBtn){
                    this.disableNextBtn = false;
                }
            }
        }
        this.query = `?page=${this.page}&limit=5&sortBy=LastModified&order=desc`;
        this.FetchExternalUsers();
    }
}